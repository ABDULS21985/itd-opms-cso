# ITD-OPMS API Reference

**Base URL:** `/api/v1`

**Authentication:** All protected endpoints require a `Bearer` token in the
`Authorization` header. Public endpoints are marked accordingly.

**Response Envelope:** All responses follow this structure:

```json
{
  "status": "success" | "error",
  "message": "optional message",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
  "errors": [{ "code": "ERROR_CODE", "message": "description", "field": "optional" }]
}
```

---

## Table of Contents

1. [Health](#1-health)
2. [Auth](#2-auth)
3. [Audit](#3-audit)
4. [Notifications](#4-notifications)
5. [Directory Sync (Admin)](#5-directory-sync-admin)
6. [Governance](#6-governance)
7. [Planning / PMO](#7-planning--pmo)
8. [ITSM](#8-itsm)
9. [CMDB](#9-cmdb)
10. [People & Workforce](#10-people--workforce)
11. [Knowledge](#11-knowledge)
12. [GRC](#12-grc)
13. [Reporting](#13-reporting)

---

## 1. Health

| Method | Path           | Description                          | Auth | Permission |
| ------ | -------------- | ------------------------------------ | ---- | ---------- |
| GET    | `/health`      | Health check for all infrastructure  | No   | -          |

Returns service status for PostgreSQL, Redis, NATS, and MinIO. HTTP 200 when
all healthy; HTTP 503 when degraded.

---

## 2. Auth

### Public Endpoints

| Method | Path                   | Description                          | Auth | Permission |
| ------ | ---------------------- | ------------------------------------ | ---- | ---------- |
| POST   | `/auth/login`          | Login with email/password (dev JWT)  | No   | -          |
| POST   | `/auth/refresh`        | Refresh access token                 | No   | -          |
| GET    | `/auth/oidc/config`    | Get OIDC configuration (enabled?)    | No   | -          |
| POST   | `/auth/oidc/callback`  | Exchange OIDC authorization code     | No   | -          |
| POST   | `/auth/oidc/refresh`   | Refresh OIDC token                   | No   | -          |

### Protected Endpoints

| Method | Path            | Description                      | Auth | Permission |
| ------ | --------------- | -------------------------------- | ---- | ---------- |
| GET    | `/auth/me`      | Get current user profile         | Yes  | -          |
| POST   | `/auth/logout`  | Logout (invalidate session)      | Yes  | -          |

---

## 3. Audit

All audit endpoints require authentication.

| Method | Path                    | Description                           | Auth | Permission |
| ------ | ----------------------- | ------------------------------------- | ---- | ---------- |
| GET    | `/audit/events`         | List audit events (paginated)         | Yes  | -          |
| GET    | `/audit/events/{id}`    | Get a single audit event              | Yes  | -          |
| GET    | `/audit/verify`         | Verify audit trail checksum integrity | Yes  | -          |

---

## 4. Notifications

All notification endpoints require authentication.

| Method | Path                             | Description                        | Auth | Permission |
| ------ | -------------------------------- | ---------------------------------- | ---- | ---------- |
| GET    | `/notifications`                 | List notifications (paginated)     | Yes  | -          |
| GET    | `/notifications/unread-count`    | Get count of unread notifications  | Yes  | -          |
| POST   | `/notifications/{id}/read`       | Mark a notification as read        | Yes  | -          |
| POST   | `/notifications/read-all`        | Mark all notifications as read     | Yes  | -          |
| GET    | `/notifications/preferences`     | Get notification preferences       | Yes  | -          |
| PUT    | `/notifications/preferences`     | Update notification preferences    | Yes  | -          |
| GET    | `/notifications/stream`          | SSE stream for real-time updates   | Yes  | -          |

---

## 5. Directory Sync (Admin)

Requires authentication and admin role. Only available when Entra ID is enabled.

| Method | Path                              | Description                  | Auth | Permission |
| ------ | --------------------------------- | ---------------------------- | ---- | ---------- |
| POST   | `/admin/directory-sync/run`       | Trigger a directory sync     | Yes  | admin      |
| GET    | `/admin/directory-sync/status`    | Get last sync run status     | Yes  | admin      |

---

## 6. Governance

All governance endpoints require authentication.

### 6.1 Policies

| Method | Path                                                        | Description                             | Auth | Permission         |
| ------ | ----------------------------------------------------------- | --------------------------------------- | ---- | ------------------ |
| GET    | `/governance/policies`                                      | List policies (paginated, filterable)   | Yes  | governance.view    |
| POST   | `/governance/policies`                                      | Create a new policy                     | Yes  | governance.manage  |
| GET    | `/governance/policies/{id}`                                 | Get policy details                      | Yes  | governance.view    |
| PUT    | `/governance/policies/{id}`                                 | Update a policy                         | Yes  | governance.manage  |
| POST   | `/governance/policies/{id}/submit`                          | Submit policy for review                | Yes  | governance.manage  |
| POST   | `/governance/policies/{id}/approve`                         | Approve a policy                        | Yes  | governance.manage  |
| POST   | `/governance/policies/{id}/publish`                         | Publish an approved policy              | Yes  | governance.manage  |
| POST   | `/governance/policies/{id}/retire`                          | Retire a policy                         | Yes  | governance.manage  |
| GET    | `/governance/policies/{id}/versions`                        | List policy version history             | Yes  | governance.view    |
| GET    | `/governance/policies/{id}/diff`                            | Diff between policy versions            | Yes  | governance.view    |
| POST   | `/governance/policies/{id}/attestation-campaigns`           | Launch attestation campaign             | Yes  | governance.manage  |
| GET    | `/governance/policies/{id}/attestation-status`              | Get attestation campaign status         | Yes  | governance.view    |
| POST   | `/governance/policies/attestations/{attestationId}/attest`  | Submit attestation response             | Yes  | (any auth user)    |

### 6.2 RACI Matrices

| Method | Path                                          | Description                         | Auth | Permission         |
| ------ | --------------------------------------------- | ----------------------------------- | ---- | ------------------ |
| GET    | `/governance/raci`                             | List RACI matrices                  | Yes  | governance.view    |
| POST   | `/governance/raci`                             | Create a RACI matrix                | Yes  | governance.manage  |
| GET    | `/governance/raci/{id}`                        | Get RACI matrix details             | Yes  | governance.view    |
| PUT    | `/governance/raci/{id}`                        | Update a RACI matrix                | Yes  | governance.manage  |
| DELETE | `/governance/raci/{id}`                        | Delete a RACI matrix                | Yes  | governance.manage  |
| GET    | `/governance/raci/{id}/coverage`               | Get RACI coverage report            | Yes  | governance.view    |
| POST   | `/governance/raci/{id}/entries`                | Add entry to RACI matrix            | Yes  | governance.manage  |
| PUT    | `/governance/raci/entries/{entryId}`           | Update a RACI entry                 | Yes  | governance.manage  |
| DELETE | `/governance/raci/entries/{entryId}`           | Delete a RACI entry                 | Yes  | governance.manage  |

### 6.3 Meetings & Decisions

| Method | Path                                            | Description                       | Auth | Permission         |
| ------ | ----------------------------------------------- | --------------------------------- | ---- | ------------------ |
| GET    | `/governance/meetings`                           | List meetings                     | Yes  | governance.view    |
| POST   | `/governance/meetings`                           | Create a meeting                  | Yes  | governance.manage  |
| GET    | `/governance/meetings/{id}`                      | Get meeting details               | Yes  | governance.view    |
| PUT    | `/governance/meetings/{id}`                      | Update a meeting                  | Yes  | governance.manage  |
| POST   | `/governance/meetings/{id}/complete`             | Mark meeting as completed         | Yes  | governance.manage  |
| POST   | `/governance/meetings/{id}/cancel`               | Cancel a meeting                  | Yes  | governance.manage  |
| GET    | `/governance/meetings/{id}/decisions`            | List decisions for a meeting      | Yes  | governance.view    |
| POST   | `/governance/meetings/{id}/decisions`            | Record a meeting decision         | Yes  | governance.manage  |

### 6.4 Action Items

| Method | Path                                              | Description                     | Auth | Permission         |
| ------ | ------------------------------------------------- | ------------------------------- | ---- | ------------------ |
| GET    | `/governance/meetings/actions`                     | List all action items           | Yes  | governance.view    |
| POST   | `/governance/meetings/actions`                     | Create an action item           | Yes  | governance.manage  |
| GET    | `/governance/meetings/actions/overdue`             | List overdue action items       | Yes  | governance.view    |
| GET    | `/governance/meetings/actions/{actionId}`          | Get action item details         | Yes  | governance.view    |
| PUT    | `/governance/meetings/actions/{actionId}`          | Update an action item           | Yes  | governance.manage  |
| POST   | `/governance/meetings/actions/{actionId}/complete` | Complete an action item         | Yes  | governance.manage  |

### 6.5 OKRs

| Method | Path                                          | Description                     | Auth | Permission         |
| ------ | --------------------------------------------- | ------------------------------- | ---- | ------------------ |
| GET    | `/governance/okrs`                             | List OKRs (filterable)          | Yes  | governance.view    |
| POST   | `/governance/okrs`                             | Create an OKR                   | Yes  | governance.manage  |
| GET    | `/governance/okrs/{id}`                        | Get OKR details                 | Yes  | governance.view    |
| PUT    | `/governance/okrs/{id}`                        | Update an OKR                   | Yes  | governance.manage  |
| GET    | `/governance/okrs/{id}/tree`                   | Get OKR hierarchy tree          | Yes  | governance.view    |
| POST   | `/governance/okrs/{id}/key-results`            | Add key result to OKR           | Yes  | governance.manage  |
| PUT    | `/governance/key-results/{krId}`               | Update a key result             | Yes  | governance.manage  |
| DELETE | `/governance/key-results/{krId}`               | Delete a key result             | Yes  | governance.manage  |

### 6.6 KPIs

| Method | Path                           | Description              | Auth | Permission         |
| ------ | ------------------------------ | ------------------------ | ---- | ------------------ |
| GET    | `/governance/kpis`             | List KPIs                | Yes  | governance.view    |
| POST   | `/governance/kpis`             | Create a KPI             | Yes  | governance.manage  |
| GET    | `/governance/kpis/{id}`        | Get KPI details          | Yes  | governance.view    |
| PUT    | `/governance/kpis/{id}`        | Update a KPI             | Yes  | governance.manage  |
| DELETE | `/governance/kpis/{id}`        | Delete a KPI             | Yes  | governance.manage  |

---

## 7. Planning / PMO

All planning endpoints require authentication.

### 7.1 Portfolios

| Method | Path                                      | Description                     | Auth | Permission       |
| ------ | ----------------------------------------- | ------------------------------- | ---- | ---------------- |
| GET    | `/planning/portfolios`                     | List portfolios                 | Yes  | planning.view    |
| GET    | `/planning/portfolios/{id}`                | Get portfolio details           | Yes  | planning.view    |
| GET    | `/planning/portfolios/{id}/roadmap`        | Get portfolio roadmap           | Yes  | planning.view    |
| GET    | `/planning/portfolios/{id}/analytics`      | Get portfolio analytics         | Yes  | planning.view    |
| POST   | `/planning/portfolios`                     | Create a portfolio              | Yes  | planning.manage  |
| PUT    | `/planning/portfolios/{id}`                | Update a portfolio              | Yes  | planning.manage  |
| DELETE | `/planning/portfolios/{id}`                | Delete a portfolio              | Yes  | planning.manage  |

### 7.2 Projects

| Method | Path                                                        | Description                          | Auth | Permission       |
| ------ | ----------------------------------------------------------- | ------------------------------------ | ---- | ---------------- |
| GET    | `/planning/projects`                                         | List projects                        | Yes  | planning.view    |
| POST   | `/planning/projects`                                         | Create a project                     | Yes  | planning.manage  |
| GET    | `/planning/projects/{id}`                                    | Get project details                  | Yes  | planning.view    |
| PUT    | `/planning/projects/{id}`                                    | Update a project                     | Yes  | planning.manage  |
| DELETE | `/planning/projects/{id}`                                    | Delete a project                     | Yes  | planning.manage  |
| POST   | `/planning/projects/{id}/approve`                            | Approve a project                    | Yes  | planning.manage  |
| GET    | `/planning/projects/{id}/dependencies`                       | List project dependencies            | Yes  | planning.view    |
| POST   | `/planning/projects/{id}/dependencies`                       | Add a project dependency             | Yes  | planning.manage  |
| DELETE | `/planning/projects/{id}/dependencies/{dependencyId}`        | Remove a project dependency          | Yes  | planning.manage  |
| GET    | `/planning/projects/{id}/stakeholders`                       | List project stakeholders            | Yes  | planning.view    |
| POST   | `/planning/projects/{id}/stakeholders`                       | Add a project stakeholder            | Yes  | planning.manage  |
| DELETE | `/planning/projects/{id}/stakeholders/{stakeholderId}`       | Remove a project stakeholder         | Yes  | planning.manage  |

### 7.3 Work Items

| Method | Path                                              | Description                          | Auth | Permission       |
| ------ | ------------------------------------------------- | ------------------------------------ | ---- | ---------------- |
| GET    | `/planning/work-items`                             | List work items (by project_id)      | Yes  | planning.view    |
| GET    | `/planning/work-items/wbs`                         | Get WBS tree (by project_id)         | Yes  | planning.view    |
| GET    | `/planning/work-items/overdue`                     | List overdue work items              | Yes  | planning.view    |
| GET    | `/planning/work-items/status-counts`               | Get status counts (by project_id)    | Yes  | planning.view    |
| POST   | `/planning/work-items`                             | Create a work item                   | Yes  | planning.manage  |
| GET    | `/planning/work-items/{id}`                        | Get work item details                | Yes  | planning.view    |
| PUT    | `/planning/work-items/{id}`                        | Update a work item                   | Yes  | planning.manage  |
| PUT    | `/planning/work-items/{id}/transition`             | Transition work item status          | Yes  | planning.manage  |
| DELETE | `/planning/work-items/{id}`                        | Delete a work item                   | Yes  | planning.manage  |
| POST   | `/planning/work-items/{id}/time-entries`           | Log a time entry                     | Yes  | planning.manage  |
| GET    | `/planning/work-items/{id}/time-entries`           | List time entries for work item      | Yes  | planning.view    |

### 7.4 Milestones

| Method | Path                              | Description                | Auth | Permission       |
| ------ | --------------------------------- | -------------------------- | ---- | ---------------- |
| GET    | `/planning/milestones`            | List milestones            | Yes  | planning.view    |
| POST   | `/planning/milestones`            | Create a milestone         | Yes  | planning.manage  |
| GET    | `/planning/milestones/{id}`       | Get milestone details      | Yes  | planning.view    |
| PUT    | `/planning/milestones/{id}`       | Update a milestone         | Yes  | planning.manage  |
| DELETE | `/planning/milestones/{id}`       | Delete a milestone         | Yes  | planning.manage  |

### 7.5 Risks

| Method | Path                          | Description            | Auth | Permission       |
| ------ | ----------------------------- | ---------------------- | ---- | ---------------- |
| GET    | `/planning/risks`             | List project risks     | Yes  | planning.view    |
| POST   | `/planning/risks`             | Create a risk          | Yes  | planning.manage  |
| GET    | `/planning/risks/{id}`        | Get risk details       | Yes  | planning.view    |
| PUT    | `/planning/risks/{id}`        | Update a risk          | Yes  | planning.manage  |
| DELETE | `/planning/risks/{id}`        | Delete a risk          | Yes  | planning.manage  |

### 7.6 Issues

| Method | Path                                | Description            | Auth | Permission       |
| ------ | ----------------------------------- | ---------------------- | ---- | ---------------- |
| GET    | `/planning/issues`                  | List project issues    | Yes  | planning.view    |
| POST   | `/planning/issues`                  | Create an issue        | Yes  | planning.manage  |
| GET    | `/planning/issues/{id}`             | Get issue details      | Yes  | planning.view    |
| PUT    | `/planning/issues/{id}`             | Update an issue        | Yes  | planning.manage  |
| PUT    | `/planning/issues/{id}/escalate`    | Escalate an issue      | Yes  | planning.manage  |
| DELETE | `/planning/issues/{id}`             | Delete an issue        | Yes  | planning.manage  |

### 7.7 Change Requests

| Method | Path                                          | Description                      | Auth | Permission       |
| ------ | --------------------------------------------- | -------------------------------- | ---- | ---------------- |
| GET    | `/planning/change-requests`                   | List change requests             | Yes  | planning.view    |
| POST   | `/planning/change-requests`                   | Create a change request          | Yes  | planning.manage  |
| GET    | `/planning/change-requests/{id}`              | Get change request details       | Yes  | planning.view    |
| PUT    | `/planning/change-requests/{id}`              | Update a change request          | Yes  | planning.manage  |
| PUT    | `/planning/change-requests/{id}/status`       | Update change request status     | Yes  | planning.manage  |
| DELETE | `/planning/change-requests/{id}`              | Delete a change request          | Yes  | planning.manage  |

---

## 8. ITSM

All ITSM endpoints require authentication.

### 8.1 Service Catalog - Categories

| Method | Path                                  | Description                 | Auth | Permission   |
| ------ | ------------------------------------- | --------------------------- | ---- | ------------ |
| GET    | `/itsm/catalog/categories`            | List catalog categories     | Yes  | itsm.view    |
| GET    | `/itsm/catalog/categories/{id}`       | Get category details        | Yes  | itsm.view    |
| POST   | `/itsm/catalog/categories`            | Create a category           | Yes  | itsm.manage  |
| PUT    | `/itsm/catalog/categories/{id}`       | Update a category           | Yes  | itsm.manage  |
| DELETE | `/itsm/catalog/categories/{id}`       | Delete a category           | Yes  | itsm.manage  |

### 8.2 Service Catalog - Items

| Method | Path                                | Description                        | Auth | Permission   |
| ------ | ----------------------------------- | ---------------------------------- | ---- | ------------ |
| GET    | `/itsm/catalog/items`               | List catalog items                 | Yes  | itsm.view    |
| GET    | `/itsm/catalog/items/entitled`      | List entitled items (for user)     | Yes  | itsm.view    |
| GET    | `/itsm/catalog/items/{id}`          | Get item details                   | Yes  | itsm.view    |
| POST   | `/itsm/catalog/items`               | Create a catalog item              | Yes  | itsm.manage  |
| PUT    | `/itsm/catalog/items/{id}`          | Update a catalog item              | Yes  | itsm.manage  |
| DELETE | `/itsm/catalog/items/{id}`          | Delete a catalog item              | Yes  | itsm.manage  |

### 8.3 Tickets

| Method | Path                                        | Description                           | Auth | Permission   |
| ------ | ------------------------------------------- | ------------------------------------- | ---- | ------------ |
| GET    | `/itsm/tickets`                              | List tickets (paginated, filterable)  | Yes  | itsm.view    |
| GET    | `/itsm/tickets/stats`                        | Get ticket statistics                 | Yes  | itsm.view    |
| GET    | `/itsm/tickets/my-queue`                     | List tickets assigned to current user | Yes  | itsm.view    |
| GET    | `/itsm/tickets/team-queue/{teamId}`          | List tickets for a team               | Yes  | itsm.view    |
| GET    | `/itsm/tickets/csat-stats`                   | Get CSAT survey statistics            | Yes  | itsm.view    |
| GET    | `/itsm/tickets/{id}`                         | Get ticket details                    | Yes  | itsm.view    |
| GET    | `/itsm/tickets/{id}/comments`                | List ticket comments                  | Yes  | itsm.view    |
| GET    | `/itsm/tickets/{id}/history`                 | List ticket status history            | Yes  | itsm.view    |
| POST   | `/itsm/tickets`                              | Create a ticket                       | Yes  | itsm.manage  |
| PUT    | `/itsm/tickets/{id}`                         | Update a ticket                       | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/transition`              | Transition ticket status              | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/assign`                  | Assign ticket to user/team            | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/escalate`                | Escalate a ticket                     | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/comments`                | Add a comment to ticket               | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/major-incident`          | Declare major incident                | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/link`                    | Link tickets (bidirectional)          | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/resolve`                 | Resolve a ticket                      | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/{id}/close`                   | Close a ticket                        | Yes  | itsm.manage  |
| POST   | `/itsm/tickets/csat`                         | Create a CSAT survey response         | Yes  | itsm.manage  |

### 8.4 SLA Policies

| Method | Path                                  | Description                | Auth | Permission   |
| ------ | ------------------------------------- | -------------------------- | ---- | ------------ |
| GET    | `/itsm/sla-policies`                  | List SLA policies          | Yes  | itsm.view    |
| GET    | `/itsm/sla-policies/default`          | Get default SLA policy     | Yes  | itsm.view    |
| GET    | `/itsm/sla-policies/{id}`             | Get SLA policy details     | Yes  | itsm.view    |
| POST   | `/itsm/sla-policies`                  | Create an SLA policy       | Yes  | itsm.manage  |
| PUT    | `/itsm/sla-policies/{id}`             | Update an SLA policy       | Yes  | itsm.manage  |
| DELETE | `/itsm/sla-policies/{id}`             | Delete an SLA policy       | Yes  | itsm.manage  |

### 8.5 Business Hours

| Method | Path                               | Description                     | Auth | Permission   |
| ------ | ---------------------------------- | ------------------------------- | ---- | ------------ |
| GET    | `/itsm/business-hours`             | List business hours calendars   | Yes  | itsm.view    |
| GET    | `/itsm/business-hours/{id}`        | Get calendar details            | Yes  | itsm.view    |
| POST   | `/itsm/business-hours`             | Create a calendar               | Yes  | itsm.manage  |
| PUT    | `/itsm/business-hours/{id}`        | Update a calendar               | Yes  | itsm.manage  |
| DELETE | `/itsm/business-hours/{id}`        | Delete a calendar               | Yes  | itsm.manage  |

### 8.6 Escalation Rules

| Method | Path                                  | Description                  | Auth | Permission   |
| ------ | ------------------------------------- | ---------------------------- | ---- | ------------ |
| GET    | `/itsm/escalation-rules`              | List escalation rules        | Yes  | itsm.view    |
| GET    | `/itsm/escalation-rules/{id}`         | Get escalation rule details  | Yes  | itsm.view    |
| POST   | `/itsm/escalation-rules`              | Create an escalation rule    | Yes  | itsm.manage  |
| PUT    | `/itsm/escalation-rules/{id}`         | Update an escalation rule    | Yes  | itsm.manage  |
| DELETE | `/itsm/escalation-rules/{id}`         | Delete an escalation rule    | Yes  | itsm.manage  |

### 8.7 SLA Compliance & Breaches

| Method | Path                                     | Description                     | Auth | Permission |
| ------ | ---------------------------------------- | ------------------------------- | ---- | ---------- |
| GET    | `/itsm/sla-compliance`                   | Get SLA compliance statistics   | Yes  | itsm.view  |
| GET    | `/itsm/sla-breaches/{ticketId}`          | List SLA breaches for a ticket  | Yes  | itsm.view  |

### 8.8 Problems & Known Errors

| Method | Path                                               | Description                        | Auth | Permission   |
| ------ | -------------------------------------------------- | ---------------------------------- | ---- | ------------ |
| GET    | `/itsm/problems`                                    | List problems                      | Yes  | itsm.view    |
| GET    | `/itsm/problems/{id}`                               | Get problem details                | Yes  | itsm.view    |
| POST   | `/itsm/problems`                                    | Create a problem                   | Yes  | itsm.manage  |
| PUT    | `/itsm/problems/{id}`                               | Update a problem                   | Yes  | itsm.manage  |
| DELETE | `/itsm/problems/{id}`                               | Delete a problem                   | Yes  | itsm.manage  |
| POST   | `/itsm/problems/{id}/link-incident`                 | Link incident to problem           | Yes  | itsm.manage  |
| GET    | `/itsm/problems/known-errors`                       | List known errors                  | Yes  | itsm.view    |
| GET    | `/itsm/problems/known-errors/{id}`                  | Get known error details            | Yes  | itsm.view    |
| POST   | `/itsm/problems/known-errors`                       | Create a known error               | Yes  | itsm.manage  |
| PUT    | `/itsm/problems/known-errors/{id}`                  | Update a known error               | Yes  | itsm.manage  |
| DELETE | `/itsm/problems/known-errors/{id}`                  | Delete a known error               | Yes  | itsm.manage  |

### 8.9 Support Queues

| Method | Path                      | Description               | Auth | Permission   |
| ------ | ------------------------- | ------------------------- | ---- | ------------ |
| GET    | `/itsm/queues`            | List support queues       | Yes  | itsm.view    |
| GET    | `/itsm/queues/{id}`       | Get queue details         | Yes  | itsm.view    |
| POST   | `/itsm/queues`            | Create a support queue    | Yes  | itsm.manage  |
| PUT    | `/itsm/queues/{id}`       | Update a support queue    | Yes  | itsm.manage  |
| DELETE | `/itsm/queues/{id}`       | Delete a support queue    | Yes  | itsm.manage  |

---

## 9. CMDB

All CMDB endpoints require authentication.

### 9.1 Assets

| Method | Path                                         | Description                        | Auth | Permission   |
| ------ | -------------------------------------------- | ---------------------------------- | ---- | ------------ |
| GET    | `/cmdb/assets`                                | List assets (paginated, filtered)  | Yes  | cmdb.view    |
| GET    | `/cmdb/assets/stats`                          | Get asset statistics               | Yes  | cmdb.view    |
| GET    | `/cmdb/assets/search`                         | Search assets                      | Yes  | cmdb.view    |
| GET    | `/cmdb/assets/{id}`                           | Get asset details                  | Yes  | cmdb.view    |
| POST   | `/cmdb/assets`                                | Create an asset                    | Yes  | cmdb.manage  |
| PUT    | `/cmdb/assets/{id}`                           | Update an asset                    | Yes  | cmdb.manage  |
| DELETE | `/cmdb/assets/{id}`                           | Delete an asset                    | Yes  | cmdb.manage  |
| POST   | `/cmdb/assets/{id}/transition`                | Transition asset status            | Yes  | cmdb.manage  |
| GET    | `/cmdb/assets/{id}/lifecycle`                 | List lifecycle events for asset    | Yes  | cmdb.view    |
| POST   | `/cmdb/assets/{id}/lifecycle`                 | Create a lifecycle event           | Yes  | cmdb.manage  |

### 9.2 Asset Disposals

| Method | Path                                              | Description                   | Auth | Permission   |
| ------ | ------------------------------------------------- | ----------------------------- | ---- | ------------ |
| GET    | `/cmdb/assets/disposals`                           | List disposals                | Yes  | cmdb.view    |
| GET    | `/cmdb/assets/disposals/{id}`                      | Get disposal details          | Yes  | cmdb.view    |
| POST   | `/cmdb/assets/disposals`                           | Create a disposal record      | Yes  | cmdb.manage  |
| PUT    | `/cmdb/assets/disposals/{disposalId}/status`       | Update disposal status        | Yes  | cmdb.manage  |

### 9.3 Configuration Items (CIs)

| Method | Path                                          | Description                        | Auth | Permission   |
| ------ | --------------------------------------------- | ---------------------------------- | ---- | ------------ |
| GET    | `/cmdb/items`                                  | List CI items                      | Yes  | cmdb.view    |
| GET    | `/cmdb/items/search`                           | Search CI items                    | Yes  | cmdb.view    |
| GET    | `/cmdb/items/{id}`                             | Get CI details                     | Yes  | cmdb.view    |
| POST   | `/cmdb/items`                                  | Create a CI                        | Yes  | cmdb.manage  |
| PUT    | `/cmdb/items/{id}`                             | Update a CI                        | Yes  | cmdb.manage  |
| DELETE | `/cmdb/items/{id}`                             | Delete a CI                        | Yes  | cmdb.manage  |
| GET    | `/cmdb/items/{id}/relationships`               | List relationships for a CI        | Yes  | cmdb.view    |

### 9.4 CI Relationships

| Method | Path                              | Description                 | Auth | Permission   |
| ------ | --------------------------------- | --------------------------- | ---- | ------------ |
| POST   | `/cmdb/relationships`             | Create a CI relationship    | Yes  | cmdb.manage  |
| DELETE | `/cmdb/relationships/{id}`        | Delete a CI relationship    | Yes  | cmdb.manage  |

### 9.5 Reconciliation

| Method | Path                                        | Description                       | Auth | Permission   |
| ------ | ------------------------------------------- | --------------------------------- | ---- | ------------ |
| GET    | `/cmdb/reconciliation`                       | List reconciliation runs          | Yes  | cmdb.view    |
| GET    | `/cmdb/reconciliation/{id}`                  | Get reconciliation run details    | Yes  | cmdb.view    |
| POST   | `/cmdb/reconciliation`                       | Create a reconciliation run       | Yes  | cmdb.manage  |
| PUT    | `/cmdb/reconciliation/{id}/complete`         | Complete a reconciliation run     | Yes  | cmdb.manage  |

### 9.6 Licenses

| Method | Path                                               | Description                         | Auth | Permission   |
| ------ | -------------------------------------------------- | ----------------------------------- | ---- | ------------ |
| GET    | `/cmdb/licenses`                                    | List licenses                       | Yes  | cmdb.view    |
| GET    | `/cmdb/licenses/compliance-stats`                   | Get compliance statistics           | Yes  | cmdb.view    |
| GET    | `/cmdb/licenses/{id}`                               | Get license details                 | Yes  | cmdb.view    |
| POST   | `/cmdb/licenses`                                    | Create a license                    | Yes  | cmdb.manage  |
| PUT    | `/cmdb/licenses/{id}`                               | Update a license                    | Yes  | cmdb.manage  |
| DELETE | `/cmdb/licenses/{id}`                               | Delete a license                    | Yes  | cmdb.manage  |
| GET    | `/cmdb/licenses/{id}/assignments`                   | List assignments for license        | Yes  | cmdb.view    |
| POST   | `/cmdb/licenses/{id}/assignments`                   | Assign a license                    | Yes  | cmdb.manage  |
| DELETE | `/cmdb/licenses/assignments/{assignmentId}`         | Remove license assignment           | Yes  | cmdb.manage  |

### 9.7 Warranties

| Method | Path                                   | Description                     | Auth | Permission   |
| ------ | -------------------------------------- | ------------------------------- | ---- | ------------ |
| GET    | `/cmdb/warranties`                      | List warranties                 | Yes  | cmdb.view    |
| GET    | `/cmdb/warranties/expiring`             | List expiring warranties        | Yes  | cmdb.view    |
| GET    | `/cmdb/warranties/{id}`                 | Get warranty details            | Yes  | cmdb.view    |
| POST   | `/cmdb/warranties`                      | Create a warranty               | Yes  | cmdb.manage  |
| PUT    | `/cmdb/warranties/{id}`                 | Update a warranty               | Yes  | cmdb.manage  |
| DELETE | `/cmdb/warranties/{id}`                 | Delete a warranty               | Yes  | cmdb.manage  |

### 9.8 Renewal Alerts

| Method | Path                                    | Description                  | Auth | Permission   |
| ------ | --------------------------------------- | ---------------------------- | ---- | ------------ |
| GET    | `/cmdb/renewal-alerts`                   | List pending renewal alerts  | Yes  | cmdb.view    |
| POST   | `/cmdb/renewal-alerts`                   | Create a renewal alert       | Yes  | cmdb.manage  |
| PUT    | `/cmdb/renewal-alerts/{id}/sent`         | Mark alert as sent           | Yes  | cmdb.manage  |

---

## 10. People & Workforce

All people endpoints require authentication.

### 10.1 Skill Categories

| Method | Path                                   | Description                    | Auth | Permission    |
| ------ | -------------------------------------- | ------------------------------ | ---- | ------------- |
| GET    | `/people/skills/categories`             | List skill categories          | Yes  | people.view   |
| GET    | `/people/skills/categories/{id}`        | Get category details           | Yes  | people.view   |
| POST   | `/people/skills/categories`             | Create a skill category        | Yes  | people.manage |
| PUT    | `/people/skills/categories/{id}`        | Update a skill category        | Yes  | people.manage |
| DELETE | `/people/skills/categories/{id}`        | Delete a skill category        | Yes  | people.manage |

### 10.2 Skills

| Method | Path                         | Description            | Auth | Permission    |
| ------ | ---------------------------- | ---------------------- | ---- | ------------- |
| GET    | `/people/skills`             | List skills            | Yes  | people.view   |
| GET    | `/people/skills/{id}`        | Get skill details      | Yes  | people.view   |
| POST   | `/people/skills`             | Create a skill         | Yes  | people.manage |
| PUT    | `/people/skills/{id}`        | Update a skill         | Yes  | people.manage |
| DELETE | `/people/skills/{id}`        | Delete a skill         | Yes  | people.manage |

### 10.3 User Skills

| Method | Path                                              | Description                       | Auth | Permission    |
| ------ | ------------------------------------------------- | --------------------------------- | ---- | ------------- |
| GET    | `/people/skills/user-skills/{userId}`              | List skills for a user            | Yes  | people.view   |
| GET    | `/people/skills/user-skills/by-skill/{skillId}`    | List users with a specific skill  | Yes  | people.view   |
| POST   | `/people/skills/user-skills`                       | Assign skill to user              | Yes  | people.manage |
| PUT    | `/people/skills/user-skills/{id}`                  | Update user skill                 | Yes  | people.manage |
| DELETE | `/people/skills/user-skills/{id}`                  | Remove user skill                 | Yes  | people.manage |
| PUT    | `/people/skills/user-skills/{id}/verify`           | Verify a user's skill             | Yes  | people.manage |

### 10.4 Role Skill Requirements & Gap Analysis

| Method | Path                                                       | Description                           | Auth | Permission    |
| ------ | ---------------------------------------------------------- | ------------------------------------- | ---- | ------------- |
| GET    | `/people/skills/requirements/{roleType}`                    | List skill requirements for a role    | Yes  | people.view   |
| GET    | `/people/skills/requirements/{roleType}/gap/{userId}`       | Get skill gap analysis for user       | Yes  | people.view   |

### 10.5 Checklist Templates

| Method | Path                                        | Description                     | Auth | Permission    |
| ------ | ------------------------------------------- | ------------------------------- | ---- | ------------- |
| GET    | `/people/checklists/templates`               | List checklist templates        | Yes  | people.view   |
| GET    | `/people/checklists/templates/{id}`          | Get template details            | Yes  | people.view   |
| POST   | `/people/checklists/templates`               | Create a checklist template     | Yes  | people.manage |
| PUT    | `/people/checklists/templates/{id}`          | Update a checklist template     | Yes  | people.manage |
| DELETE | `/people/checklists/templates/{id}`          | Delete a checklist template     | Yes  | people.manage |

### 10.6 Checklists

| Method | Path                                       | Description                  | Auth | Permission    |
| ------ | ------------------------------------------ | ---------------------------- | ---- | ------------- |
| GET    | `/people/checklists`                        | List checklists              | Yes  | people.view   |
| GET    | `/people/checklists/{id}`                   | Get checklist details        | Yes  | people.view   |
| POST   | `/people/checklists`                        | Create a checklist           | Yes  | people.manage |
| PUT    | `/people/checklists/{id}/status`            | Update checklist status      | Yes  | people.manage |
| DELETE | `/people/checklists/{id}`                   | Delete a checklist           | Yes  | people.manage |

### 10.7 Checklist Tasks

| Method | Path                                                  | Description                     | Auth | Permission    |
| ------ | ----------------------------------------------------- | ------------------------------- | ---- | ------------- |
| GET    | `/people/checklists/tasks/{checklistId}`               | List tasks for a checklist      | Yes  | people.view   |
| POST   | `/people/checklists/tasks`                             | Create a checklist task         | Yes  | people.manage |
| GET    | `/people/checklists/tasks/item/{id}`                   | Get task details                | Yes  | people.view   |
| PUT    | `/people/checklists/tasks/item/{id}`                   | Update a task                   | Yes  | people.manage |
| PUT    | `/people/checklists/tasks/item/{id}/complete`          | Complete a task                 | Yes  | people.manage |
| DELETE | `/people/checklists/tasks/item/{id}`                   | Delete a task                   | Yes  | people.manage |

### 10.8 Rosters

| Method | Path                          | Description            | Auth | Permission    |
| ------ | ----------------------------- | ---------------------- | ---- | ------------- |
| GET    | `/people/rosters`             | List rosters           | Yes  | people.view   |
| GET    | `/people/rosters/{id}`        | Get roster details     | Yes  | people.view   |
| POST   | `/people/rosters`             | Create a roster        | Yes  | people.manage |
| PUT    | `/people/rosters/{id}`        | Update a roster        | Yes  | people.manage |

### 10.9 Leave Records

| Method | Path                              | Description                   | Auth | Permission    |
| ------ | --------------------------------- | ----------------------------- | ---- | ------------- |
| GET    | `/people/leave`                   | List leave records            | Yes  | people.view   |
| GET    | `/people/leave/{id}`              | Get leave record details      | Yes  | people.view   |
| POST   | `/people/leave`                   | Create a leave record         | Yes  | people.manage |
| PUT    | `/people/leave/{id}/status`       | Update leave status           | Yes  | people.manage |
| DELETE | `/people/leave/{id}`              | Delete a leave record         | Yes  | people.manage |

### 10.10 Capacity Allocations

| Method | Path                            | Description                      | Auth | Permission    |
| ------ | ------------------------------- | -------------------------------- | ---- | ------------- |
| GET    | `/people/capacity`              | List capacity allocations        | Yes  | people.view   |
| POST   | `/people/capacity`              | Create a capacity allocation     | Yes  | people.manage |
| PUT    | `/people/capacity/{id}`         | Update a capacity allocation     | Yes  | people.manage |
| DELETE | `/people/capacity/{id}`         | Delete a capacity allocation     | Yes  | people.manage |

### 10.11 Training Records

| Method | Path                                | Description                          | Auth | Permission    |
| ------ | ----------------------------------- | ------------------------------------ | ---- | ------------- |
| GET    | `/people/training`                  | List training records                | Yes  | people.view   |
| GET    | `/people/training/expiring`         | List expiring certifications         | Yes  | people.view   |
| GET    | `/people/training/{id}`             | Get training record details          | Yes  | people.view   |
| POST   | `/people/training`                  | Create a training record             | Yes  | people.manage |
| PUT    | `/people/training/{id}`             | Update a training record             | Yes  | people.manage |
| DELETE | `/people/training/{id}`             | Delete a training record             | Yes  | people.manage |

---

## 11. Knowledge

All knowledge endpoints require authentication.

### 11.1 Categories

| Method | Path                                  | Description                  | Auth | Permission        |
| ------ | ------------------------------------- | ---------------------------- | ---- | ----------------- |
| GET    | `/knowledge/categories`               | List KB categories           | Yes  | knowledge.view    |
| GET    | `/knowledge/categories/{id}`          | Get category details         | Yes  | knowledge.view    |
| POST   | `/knowledge/categories`               | Create a category            | Yes  | knowledge.manage  |
| PUT    | `/knowledge/categories/{id}`          | Update a category            | Yes  | knowledge.manage  |
| DELETE | `/knowledge/categories/{id}`          | Delete a category            | Yes  | knowledge.manage  |

### 11.2 Articles

| Method | Path                                           | Description                       | Auth | Permission        |
| ------ | ---------------------------------------------- | --------------------------------- | ---- | ----------------- |
| GET    | `/knowledge/articles`                           | List articles                     | Yes  | knowledge.view    |
| GET    | `/knowledge/articles/search`                    | Search articles                   | Yes  | knowledge.view    |
| GET    | `/knowledge/articles/slug/{slug}`               | Get article by slug               | Yes  | knowledge.view    |
| GET    | `/knowledge/articles/{id}`                      | Get article details               | Yes  | knowledge.view    |
| POST   | `/knowledge/articles`                           | Create an article                 | Yes  | knowledge.manage  |
| PUT    | `/knowledge/articles/{id}`                      | Update an article                 | Yes  | knowledge.manage  |
| DELETE | `/knowledge/articles/{id}`                      | Delete an article                 | Yes  | knowledge.manage  |
| POST   | `/knowledge/articles/{id}/publish`              | Publish an article                | Yes  | knowledge.manage  |
| POST   | `/knowledge/articles/{id}/archive`              | Archive an article                | Yes  | knowledge.manage  |
| POST   | `/knowledge/articles/{id}/view`                 | Increment view count              | Yes  | knowledge.view    |

### 11.3 Article Feedback

| Method | Path                                                   | Description                       | Auth | Permission        |
| ------ | ------------------------------------------------------ | --------------------------------- | ---- | ----------------- |
| GET    | `/knowledge/articles/{articleId}/feedback`              | List feedback for article         | Yes  | knowledge.view    |
| GET    | `/knowledge/articles/{articleId}/feedback/stats`        | Get feedback statistics           | Yes  | knowledge.view    |
| POST   | `/knowledge/articles/{articleId}/feedback`              | Submit feedback                   | Yes  | knowledge.view    |
| DELETE | `/knowledge/articles/{articleId}/feedback/{id}`         | Delete feedback                   | Yes  | knowledge.manage  |

### 11.4 Announcements

| Method | Path                                  | Description                  | Auth | Permission        |
| ------ | ------------------------------------- | ---------------------------- | ---- | ----------------- |
| GET    | `/knowledge/announcements`            | List announcements           | Yes  | knowledge.view    |
| GET    | `/knowledge/announcements/{id}`       | Get announcement details     | Yes  | knowledge.view    |
| POST   | `/knowledge/announcements`            | Create an announcement       | Yes  | knowledge.manage  |
| PUT    | `/knowledge/announcements/{id}`       | Update an announcement       | Yes  | knowledge.manage  |
| DELETE | `/knowledge/announcements/{id}`       | Delete an announcement       | Yes  | knowledge.manage  |

---

## 12. GRC

All GRC endpoints require authentication.

### 12.1 Risk Management

| Method | Path                                       | Description                        | Auth | Permission   |
| ------ | ------------------------------------------ | ---------------------------------- | ---- | ------------ |
| GET    | `/grc/risks`                                | List risks                         | Yes  | grc.view     |
| GET    | `/grc/risks/heat-map`                       | Get risk heat map data             | Yes  | grc.view     |
| GET    | `/grc/risks/review-needed`                  | List risks needing review          | Yes  | grc.view     |
| GET    | `/grc/risks/{id}`                           | Get risk details                   | Yes  | grc.view     |
| POST   | `/grc/risks`                                | Create a risk                      | Yes  | grc.manage   |
| PUT    | `/grc/risks/{id}`                           | Update a risk                      | Yes  | grc.manage   |
| DELETE | `/grc/risks/{id}`                           | Delete a risk                      | Yes  | grc.manage   |
| POST   | `/grc/risks/{id}/assess`                    | Create a risk assessment           | Yes  | grc.manage   |
| GET    | `/grc/risks/{id}/assessments`               | List risk assessments              | Yes  | grc.view     |
| POST   | `/grc/risks/{id}/escalate`                  | Escalate a risk                    | Yes  | grc.manage   |

### 12.2 Audit Management

| Method | Path                                                     | Description                           | Auth | Permission   |
| ------ | -------------------------------------------------------- | ------------------------------------- | ---- | ------------ |
| GET    | `/grc/audits`                                             | List GRC audits                       | Yes  | grc.view     |
| GET    | `/grc/audits/{id}`                                        | Get audit details                     | Yes  | grc.view     |
| POST   | `/grc/audits`                                             | Create a GRC audit                    | Yes  | grc.manage   |
| PUT    | `/grc/audits/{id}`                                        | Update a GRC audit                    | Yes  | grc.manage   |
| DELETE | `/grc/audits/{id}`                                        | Delete a GRC audit                    | Yes  | grc.manage   |
| GET    | `/grc/audits/{id}/readiness`                              | Get audit readiness score             | Yes  | grc.view     |
| GET    | `/grc/audits/{auditId}/findings`                          | List findings for an audit            | Yes  | grc.view     |
| GET    | `/grc/audits/{auditId}/findings/{findingId}`              | Get finding details                   | Yes  | grc.view     |
| POST   | `/grc/audits/{auditId}/findings`                          | Create a finding                      | Yes  | grc.manage   |
| PUT    | `/grc/audits/{auditId}/findings/{findingId}`              | Update a finding                      | Yes  | grc.manage   |
| POST   | `/grc/audits/{auditId}/findings/{findingId}/close`        | Close a finding                       | Yes  | grc.manage   |
| GET    | `/grc/audits/{auditId}/evidence`                          | List evidence collections             | Yes  | grc.view     |
| GET    | `/grc/audits/{auditId}/evidence/{evidenceId}`             | Get evidence collection details       | Yes  | grc.view     |
| POST   | `/grc/audits/{auditId}/evidence`                          | Create an evidence collection         | Yes  | grc.manage   |
| PUT    | `/grc/audits/{auditId}/evidence/{evidenceId}`             | Update an evidence collection         | Yes  | grc.manage   |
| POST   | `/grc/audits/{auditId}/evidence/{evidenceId}/approve`     | Approve an evidence collection        | Yes  | grc.manage   |

### 12.3 Access Reviews

| Method | Path                                                          | Description                       | Auth | Permission   |
| ------ | ------------------------------------------------------------- | --------------------------------- | ---- | ------------ |
| GET    | `/grc/access-reviews`                                          | List access review campaigns      | Yes  | grc.view     |
| GET    | `/grc/access-reviews/{id}`                                     | Get campaign details              | Yes  | grc.view     |
| POST   | `/grc/access-reviews`                                          | Create a review campaign          | Yes  | grc.manage   |
| PUT    | `/grc/access-reviews/{id}`                                     | Update a review campaign          | Yes  | grc.manage   |
| GET    | `/grc/access-reviews/{campaignId}/entries`                     | List review entries               | Yes  | grc.view     |
| POST   | `/grc/access-reviews/{campaignId}/entries`                     | Create a review entry             | Yes  | grc.manage   |
| POST   | `/grc/access-reviews/{campaignId}/entries/{entryId}/decide`    | Record access decision            | Yes  | grc.manage   |

### 12.4 Compliance Controls

| Method | Path                               | Description                       | Auth | Permission   |
| ------ | ---------------------------------- | --------------------------------- | ---- | ------------ |
| GET    | `/grc/compliance`                  | List compliance controls          | Yes  | grc.view     |
| GET    | `/grc/compliance/stats`            | Get compliance statistics         | Yes  | grc.view     |
| GET    | `/grc/compliance/{id}`             | Get control details               | Yes  | grc.view     |
| POST   | `/grc/compliance`                  | Create a compliance control       | Yes  | grc.manage   |
| PUT    | `/grc/compliance/{id}`             | Update a compliance control       | Yes  | grc.manage   |
| DELETE | `/grc/compliance/{id}`             | Delete a compliance control       | Yes  | grc.manage   |

---

## 13. Reporting

The reporting module is currently a placeholder.

| Method | Path              | Description                              | Auth | Permission |
| ------ | ----------------- | ---------------------------------------- | ---- | ---------- |
| GET    | `/reporting`      | Module info (not yet implemented)        | Yes  | -          |

---

## Common Query Parameters

All list endpoints support these standard pagination parameters:

| Parameter | Type   | Default      | Description                           |
| --------- | ------ | ------------ | ------------------------------------- |
| `page`    | int    | 1            | Page number (1-based)                 |
| `limit`   | int    | 20           | Items per page (max 100)              |
| `sort`    | string | `created_at` | Field to sort by                      |
| `order`   | string | `desc`       | Sort direction (`asc` or `desc`)      |

---

## Error Codes

| Code              | HTTP Status | Description                       |
| ----------------- | ----------- | --------------------------------- |
| `BAD_REQUEST`     | 400         | Malformed request body or params  |
| `UNAUTHORIZED`    | 401         | Missing or invalid auth token     |
| `FORBIDDEN`       | 403         | Insufficient permissions          |
| `NOT_FOUND`       | 404         | Resource not found                |
| `CONFLICT`        | 409         | Duplicate or conflicting resource |
| `VALIDATION_ERROR`| 422         | Field validation failure          |
| `INTERNAL_ERROR`  | 500         | Unexpected server error           |
| `CSRF_FAILED`     | 403         | Cross-origin request blocked      |

---

## Authentication Methods

### Dev JWT (Development)

```bash
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@itd.cbn.gov.ng","password":"admin123"}'

# Response includes accessToken and refreshToken
# Use in subsequent requests:
curl -H "Authorization: Bearer <accessToken>" /api/v1/...
```

### Entra ID OIDC (Production)

1. Frontend initiates PKCE flow via `/auth/oidc/config`
2. User authenticates with Microsoft
3. Frontend exchanges code via `/auth/oidc/callback`
4. Session maintained via httpOnly cookies
5. Token refresh via `/auth/oidc/refresh`

The API middleware tries Entra ID OIDC validation first, then falls back to
dev JWT. Both methods populate the same `AuthContext` in the request.

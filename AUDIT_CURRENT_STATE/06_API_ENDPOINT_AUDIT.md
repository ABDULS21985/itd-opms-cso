# 06 -- API Endpoint Audit: ITD-OPMS Backend

**Audit Date:** 2026-03-02
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** `itd-opms-api/` -- Go (chi router) REST API
**Evidence Base:** Code review of `server.go`, all module `handler.go` and sub-handler files, middleware chain, and shared response types

---

## 1. Executive Summary

The ITD-OPMS API is a Go HTTP server built on the `go-chi/chi/v5` router with **15+ domain modules**, a dual-mode authentication system (Microsoft Entra ID OIDC + dev JWT), structured audit logging, and a consistent JSON response envelope. The API exposes approximately **250+ registered route endpoints** under the `/api/v1` prefix. All protected routes pass through the `AuthDualMode` middleware and `AuditMiddleware`. RBAC enforcement via `RequirePermission` is applied per-handler on most modules, with notable gaps in the Governance, Planning, ITSM (partially), CMDB, Knowledge, GRC, and Reporting modules where authentication is present but fine-grained permission checks are absent at the handler level (relying only on the global auth gate).

---

## 2. Global Middleware Chain

Applied in order on every request:

| Order | Middleware | File | Purpose |
|-------|-----------|------|---------|
| 1 | `Recovery` | `middleware/recovery.go` | Panic recovery with structured error response |
| 2 | `Correlation` | `middleware/correlation.go` | Inject/propagate `X-Correlation-ID` header |
| 3 | `Logging` | `middleware/logging.go` | Structured request/response logging (slog) |
| 4 | `RealIP` | `chi/middleware.RealIP` | Extract real client IP from proxy headers |
| 5 | `CORS` | `go-chi/cors` | Allowed origins: `localhost:3000`, `localhost:5173`, `*.itd-opms.gov.ph` |
| 6 | `SecurityHeaders` | `middleware/security.go` | CSP, X-Frame-Options, X-Content-Type-Options, etc. |
| 7 | `CSRFProtection` | `middleware/csrf.go` | CSRF token validation for state-changing requests |
| 8 | `MetricsMiddleware` | `metrics/prometheus.go` | Prometheus request/response metrics |
| 9 | `RateLimitByIP` | `middleware/ratelimit.go` | 100 req/min per IP (Redis-backed, if available) |

**Evidence:** `internal/platform/server/server.go` lines 91-111

---

## 3. Authentication Architecture

### 3.1 Dual-Mode Auth (`AuthDualMode`)

| Mode | Token Type | Validation | Source |
|------|-----------|------------|--------|
| Entra ID (production) | RS256 JWT from Microsoft | `OIDCValidator.ValidateToken()` + user lookup in DB | `Authorization: Bearer <oidc-token>` |
| Dev JWT (development) | HS256 JWT (local secret) | `auth.ValidateToken()` | `Authorization: Bearer <dev-token>` |

**Flow:** Entra ID validation attempted first (if enabled), then falls back to dev JWT.

**Evidence:** `internal/platform/middleware/auth.go`

### 3.2 RBAC Middleware (`RequirePermission`)

```go
middleware.RequirePermission("system.manage")
```

- Reads `AuthContext.Permissions` from request context (populated by auth middleware)
- Returns `403 Forbidden` with structured error if permission is absent
- Applied per-route via `r.With(middleware.RequirePermission(...))` or per-group

**Evidence:** `internal/platform/middleware/rbac.go`

---

## 4. Response Envelope Standard

All responses follow the shared envelope defined in `internal/shared/types/response.go`:

### Success Response (200 OK)

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Created Response (201 Created)

```json
{
  "status": "success",
  "message": "Resource created",
  "data": { ... }
}
```

### No Content (204)

Empty body, no JSON.

### Error Response (4xx/5xx)

```json
{
  "status": "error",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Title is required",
      "field": "title"
    }
  ]
}
```

**Evidence:** `internal/shared/types/response.go` -- `OK()`, `Created()`, `NoContent()`, `Error()`, `ErrorMessage()`

---

## 5. Complete Route Registry

### 5.1 Public Routes (No Authentication)

| Method | Path | Module | Handler | RBAC | Validation | Pagination | Status | Evidence |
|--------|------|--------|---------|------|------------|------------|--------|----------|
| GET | `/api/v1/health` | Platform | `HealthHandler` | None | N/A | No | Active | `server/health.go` |
| POST | `/api/v1/auth/login` | Auth | `AuthHandler.Login` | None | JSON body (email, password) | No | Active | `platform/auth/jwt.go` |
| POST | `/api/v1/auth/refresh` | Auth | `AuthHandler.Refresh` | None | JSON body (refreshToken) | No | Active | `platform/auth/jwt.go` |
| GET | `/api/v1/auth/oidc/config` | Auth | `OIDCHandler.OIDCConfig` | None | N/A | No | Active | `platform/auth/oidc.go` |
| POST | `/api/v1/auth/oidc/callback` | Auth | `OIDCHandler.ExchangeCode` | None | JSON body (code, codeVerifier) | No | Active | `platform/auth/oidc.go` |
| POST | `/api/v1/auth/oidc/refresh` | Auth | `OIDCHandler.RefreshOIDCToken` | None | JSON body (refreshToken) | No | Active | `platform/auth/oidc.go` |
| GET | `/metrics` | Prometheus | `metrics.Handler()` | None | N/A | No | Active | `platform/metrics/prometheus.go` |

### 5.2 Protected Auth Routes (AuthDualMode only)

| Method | Path | Module | Handler | RBAC | Tenant | Status | Evidence |
|--------|------|--------|---------|------|--------|--------|----------|
| GET | `/api/v1/auth/me` | Auth | `AuthHandler.Me` | None | Via AuthContext | Active | `platform/auth/jwt.go` |
| POST | `/api/v1/auth/logout` | Auth | `AuthHandler.Logout` | None | Via AuthContext | Active | `platform/auth/jwt.go` |

### 5.3 Audit Module (Auth + Audit middleware)

| Method | Path | Handler | RBAC | Pagination | Filtering | Status | Evidence |
|--------|------|---------|------|------------|-----------|--------|----------|
| GET | `/api/v1/audit/events` | `AuditHandler.listEvents` | None (auth-only) | Yes | action, entity_type, entity_id, actor_id, date_from, date_to | Active | `platform/audit/handler.go` |
| GET | `/api/v1/audit/events/{eventID}` | `AuditHandler.getEvent` | None (auth-only) | No | N/A | Active | `platform/audit/handler.go` |
| GET | `/api/v1/audit/verify` | `AuditHandler.verifyIntegrity` | None (auth-only) | No | N/A | Active | `platform/audit/handler.go` |

**Note:** Tenant isolation is enforced in the service layer (query filters by `auth.TenantID`).

### 5.4 Notification Module (Auth + Audit middleware)

| Method | Path | Handler | RBAC | Pagination | Status | Evidence |
|--------|------|---------|------|------------|--------|----------|
| GET | `/api/v1/notifications` | `Handler.ListNotifications` | None (auth-only) | Yes | Active | `notification/handler.go` |
| GET | `/api/v1/notifications/unread-count` | `Handler.GetUnreadCount` | None (auth-only) | No | Active | `notification/handler.go` |
| POST | `/api/v1/notifications/{id}/read` | `Handler.MarkAsRead` | None (auth-only) | No | Active | `notification/handler.go` |
| POST | `/api/v1/notifications/read-all` | `Handler.MarkAllAsRead` | None (auth-only) | No | Active | `notification/handler.go` |
| GET | `/api/v1/notifications/preferences` | `Handler.GetPreferences` | None (auth-only) | No | Active | `notification/handler.go` |
| PUT | `/api/v1/notifications/preferences` | `Handler.UpdatePreferences` | None (auth-only) | No | Active | `notification/handler.go` |
| GET | `/api/v1/notifications/stream` | `SSEHandler.ServeHTTP` | None (auth-only) | No (SSE) | Active | `notification/sse.go` |

### 5.5 Governance Module (Auth + Audit, NO per-handler RBAC)

#### Policies

| Method | Path | Handler | RBAC | Pagination | Filtering | Status |
|--------|------|---------|------|------------|-----------|--------|
| GET | `/api/v1/governance/policies` | `PolicyHandler.List` | **MISSING** | Yes | status, search | Active |
| GET | `/api/v1/governance/policies/{id}` | `PolicyHandler.Get` | **MISSING** | No | N/A | Active |
| POST | `/api/v1/governance/policies` | `PolicyHandler.Create` | **MISSING** | No | JSON body | Active |
| PUT | `/api/v1/governance/policies/{id}` | `PolicyHandler.Update` | **MISSING** | No | JSON body | Active |
| DELETE | `/api/v1/governance/policies/{id}` | `PolicyHandler.Delete` | **MISSING** | No | N/A | Active |
| GET | `/api/v1/governance/policies/{id}/versions` | `PolicyHandler.ListVersions` | **MISSING** | No | N/A | Active |
| GET | `/api/v1/governance/policies/{id}/attestations` | `PolicyHandler.ListAttestations` | **MISSING** | Yes | N/A | Active |
| POST | `/api/v1/governance/policies/{id}/attest` | `PolicyHandler.Attest` | **MISSING** | No | JSON body | Active |

#### RACI

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/governance/raci` | `RACIHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/governance/raci/{id}` | `RACIHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/governance/raci` | `RACIHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/governance/raci/{id}` | `RACIHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/governance/raci/{id}` | `RACIHandler.Delete` | **MISSING** | No | Active |

#### Meetings

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/governance/meetings` | `MeetingHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/governance/meetings/{id}` | `MeetingHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/governance/meetings` | `MeetingHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/governance/meetings/{id}` | `MeetingHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/governance/meetings/{id}` | `MeetingHandler.Delete` | **MISSING** | No | Active |
| POST | `/api/v1/governance/meetings/{id}/decisions` | `MeetingHandler.AddDecision` | **MISSING** | No | Active |
| POST | `/api/v1/governance/meetings/{id}/actions` | `MeetingHandler.AddAction` | **MISSING** | No | Active |
| PUT | `/api/v1/governance/meetings/actions/{id}` | `MeetingHandler.UpdateAction` | **MISSING** | No | Active |

#### OKRs, Key Results & KPIs

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/governance/okrs` | `OKRHandler.ListOKRs` | **MISSING** | Yes | Active |
| GET | `/api/v1/governance/okrs/{id}` | `OKRHandler.GetOKR` | **MISSING** | No | Active |
| POST | `/api/v1/governance/okrs` | `OKRHandler.CreateOKR` | **MISSING** | No | Active |
| PUT | `/api/v1/governance/okrs/{id}` | `OKRHandler.UpdateOKR` | **MISSING** | No | Active |
| DELETE | `/api/v1/governance/okrs/{id}` | `OKRHandler.DeleteOKR` | **MISSING** | No | Active |
| GET | `/api/v1/governance/key-results` | `OKRHandler.ListKeyResults` | **MISSING** | Yes | Active |
| POST | `/api/v1/governance/key-results` | `OKRHandler.CreateKeyResult` | **MISSING** | No | Active |
| PUT | `/api/v1/governance/key-results/{id}` | `OKRHandler.UpdateKeyResult` | **MISSING** | No | Active |
| DELETE | `/api/v1/governance/key-results/{id}` | `OKRHandler.DeleteKeyResult` | **MISSING** | No | Active |
| GET | `/api/v1/governance/kpis` | `OKRHandler.ListKPIs` | **MISSING** | Yes | Active |
| POST | `/api/v1/governance/kpis` | `OKRHandler.CreateKPI` | **MISSING** | No | Active |
| PUT | `/api/v1/governance/kpis/{id}` | `OKRHandler.UpdateKPI` | **MISSING** | No | Active |
| DELETE | `/api/v1/governance/kpis/{id}` | `OKRHandler.DeleteKPI` | **MISSING** | No | Active |

### 5.6 Planning Module (Auth + Audit, NO per-handler RBAC)

#### Portfolios

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/planning/portfolios` | `PortfolioHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/portfolios/{id}` | `PortfolioHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/planning/portfolios` | `PortfolioHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/portfolios/{id}` | `PortfolioHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/portfolios/{id}` | `PortfolioHandler.Delete` | **MISSING** | No | Active |
| GET | `/api/v1/planning/portfolios/{id}/analytics` | `PortfolioHandler.Analytics` | **MISSING** | No | Active |

#### Projects

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/planning/projects` | `ProjectHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/projects/{id}` | `ProjectHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects` | `ProjectHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/projects/{id}` | `ProjectHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/projects/{id}` | `ProjectHandler.Delete` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects/{id}/approve` | `ProjectHandler.Approve` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects/{id}/divisions` | `ProjectHandler.AssignDivision` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/projects/{id}/divisions/reassign` | `ProjectHandler.ReassignDivision` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/projects/{id}/divisions/{divId}` | `ProjectHandler.UnassignDivision` | **MISSING** | No | Active |
| GET | `/api/v1/planning/projects/{id}/divisions/log` | `ProjectHandler.DivisionLog` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects/{id}/dependencies` | `ProjectHandler.AddDependency` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/projects/{id}/dependencies/{depId}` | `ProjectHandler.RemoveDependency` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects/{id}/stakeholders` | `ProjectHandler.AddStakeholder` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/projects/{id}/stakeholders/{shId}` | `ProjectHandler.RemoveStakeholder` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects/{id}/documents` | `DocumentHandler.Upload` (multipart) | **MISSING** | No | Active |
| GET | `/api/v1/planning/projects/{id}/documents` | `DocumentHandler.List` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/projects/{id}/documents/{docId}` | `DocumentHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/projects/{id}/documents/{docId}` | `DocumentHandler.Delete` | **MISSING** | No | Active |
| GET | `/api/v1/planning/projects/{id}/documents/{docId}/download` | `DocumentHandler.Download` | **MISSING** | No | Active |
| GET | `/api/v1/planning/projects/{id}/budget` | `BudgetHandler.GetProjectBudget` | **MISSING** | No | Active |
| POST | `/api/v1/planning/projects/{id}/budget/items` | `BudgetHandler.CreateItem` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/projects/{id}/budget/items/{itemId}` | `BudgetHandler.UpdateItem` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/projects/{id}/budget/items/{itemId}` | `BudgetHandler.DeleteItem` | **MISSING** | No | Active |

#### Work Items

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/planning/work-items` | `WorkItemHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/work-items/{id}` | `WorkItemHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/planning/work-items` | `WorkItemHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/work-items/{id}` | `WorkItemHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/work-items/{id}` | `WorkItemHandler.Delete` | **MISSING** | No | Active |
| POST | `/api/v1/planning/work-items/{id}/transition` | `WorkItemHandler.Transition` | **MISSING** | No | Active |

#### Milestones

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/planning/milestones` | `MilestoneHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/milestones/{id}` | `MilestoneHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/planning/milestones` | `MilestoneHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/milestones/{id}` | `MilestoneHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/milestones/{id}` | `MilestoneHandler.Delete` | **MISSING** | No | Active |

#### Risks, Issues, Change Requests

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/planning/risks` | `RiskHandler.ListRisks` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/risks/{id}` | `RiskHandler.GetRisk` | **MISSING** | No | Active |
| POST | `/api/v1/planning/risks` | `RiskHandler.CreateRisk` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/risks/{id}` | `RiskHandler.UpdateRisk` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/risks/{id}` | `RiskHandler.DeleteRisk` | **MISSING** | No | Active |
| GET | `/api/v1/planning/issues` | `RiskHandler.ListIssues` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/issues/{id}` | `RiskHandler.GetIssue` | **MISSING** | No | Active |
| POST | `/api/v1/planning/issues` | `RiskHandler.CreateIssue` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/issues/{id}` | `RiskHandler.UpdateIssue` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/issues/{id}` | `RiskHandler.DeleteIssue` | **MISSING** | No | Active |
| POST | `/api/v1/planning/issues/{id}/escalate` | `RiskHandler.EscalateIssue` | **MISSING** | No | Active |
| GET | `/api/v1/planning/change-requests` | `RiskHandler.ListChangeRequests` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/change-requests/{id}` | `RiskHandler.GetChangeRequest` | **MISSING** | No | Active |
| POST | `/api/v1/planning/change-requests` | `RiskHandler.CreateChangeRequest` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/change-requests/{id}` | `RiskHandler.UpdateChangeRequest` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/change-requests/{id}/status` | `RiskHandler.UpdateChangeRequestStatus` | **MISSING** | No | Active |

#### Timeline

| Method | Path | Handler | RBAC | Status |
|--------|------|---------|------|--------|
| GET | `/api/v1/planning/timeline/portfolio/{id}` | `TimelineHandler.PortfolioTimeline` | **MISSING** | Active |
| GET | `/api/v1/planning/timeline/project/{id}` | `TimelineHandler.ProjectTimeline` | **MISSING** | Active |

#### PIR (Post-Implementation Reviews)

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/planning/pir` | `PIRHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/planning/pir/{id}` | `PIRHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/planning/pir` | `PIRHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/planning/pir/{id}` | `PIRHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/planning/pir/{id}` | `PIRHandler.Delete` | **MISSING** | No | Active |

#### Budget (Cost Categories)

| Method | Path | Handler | RBAC | Status |
|--------|------|---------|------|--------|
| GET | `/api/v1/planning/budget/cost-categories` | `CostCategoryHandler.List` | **MISSING** | Active |
| POST | `/api/v1/planning/budget/cost-categories` | `CostCategoryHandler.Create` | **MISSING** | Active |
| PUT | `/api/v1/planning/budget/cost-categories/{id}` | `CostCategoryHandler.Update` | **MISSING** | Active |
| DELETE | `/api/v1/planning/budget/cost-categories/{id}` | `CostCategoryHandler.Delete` | **MISSING** | Active |
| GET | `/api/v1/planning/budget/portfolio/{id}` | `CostCategoryHandler.PortfolioBudget` | **MISSING** | Active |

### 5.7 ITSM Module (Auth + Audit, per-handler RBAC via `RequirePermission`)

#### Service Catalog

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/itsm/catalog/categories` | `CatalogHandler.ListCategories` | `itsm.view` | No | Active |
| GET | `/api/v1/itsm/catalog/categories/{id}` | `CatalogHandler.GetCategory` | `itsm.view` | No | Active |
| POST | `/api/v1/itsm/catalog/categories` | `CatalogHandler.CreateCategory` | `itsm.manage` | No | Active |
| PUT | `/api/v1/itsm/catalog/categories/{id}` | `CatalogHandler.UpdateCategory` | `itsm.manage` | No | Active |
| DELETE | `/api/v1/itsm/catalog/categories/{id}` | `CatalogHandler.DeleteCategory` | `itsm.manage` | No | Active |
| GET | `/api/v1/itsm/catalog/items` | `CatalogHandler.ListItems` | `itsm.view` | Yes | Active |
| GET | `/api/v1/itsm/catalog/items/entitled` | `CatalogHandler.ListEntitledItems` | `itsm.view` | Yes | Active |
| GET | `/api/v1/itsm/catalog/items/{id}` | `CatalogHandler.GetItem` | `itsm.view` | No | Active |
| POST | `/api/v1/itsm/catalog/items` | `CatalogHandler.CreateItem` | `itsm.manage` | No | Active |
| PUT | `/api/v1/itsm/catalog/items/{id}` | `CatalogHandler.UpdateItem` | `itsm.manage` | No | Active |
| DELETE | `/api/v1/itsm/catalog/items/{id}` | `CatalogHandler.DeleteItem` | `itsm.manage` | No | Active |

#### Tickets

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/itsm/tickets` | `TicketHandler.List` | `itsm.view` | Yes | Active |
| GET | `/api/v1/itsm/tickets/{id}` | `TicketHandler.Get` | `itsm.view` | No | Active |
| POST | `/api/v1/itsm/tickets` | `TicketHandler.Create` | `itsm.manage` | No | Active |
| PUT | `/api/v1/itsm/tickets/{id}` | `TicketHandler.Update` | `itsm.manage` | No | Active |
| POST | `/api/v1/itsm/tickets/{id}/assign` | `TicketHandler.Assign` | `itsm.manage` | No | Active |
| POST | `/api/v1/itsm/tickets/{id}/transition` | `TicketHandler.Transition` | `itsm.manage` | No | Active |
| POST | `/api/v1/itsm/tickets/{id}/comments` | `TicketHandler.AddComment` | `itsm.view` | No | Active |
| GET | `/api/v1/itsm/tickets/{id}/comments` | `TicketHandler.ListComments` | `itsm.view` | No | Active |
| GET | `/api/v1/itsm/tickets/{id}/history` | `TicketHandler.History` | `itsm.view` | No | Active |

#### SLA Policies, Business Hours, Escalation Rules

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/itsm/sla-policies` | `SLAHandler.ListPolicies` | `itsm.view` | Active |
| GET | `/api/v1/itsm/sla-policies/default` | `SLAHandler.GetDefaultPolicy` | `itsm.view` | Active |
| GET | `/api/v1/itsm/sla-policies/{id}` | `SLAHandler.GetPolicy` | `itsm.view` | Active |
| POST | `/api/v1/itsm/sla-policies` | `SLAHandler.CreatePolicy` | `itsm.manage` | Active |
| PUT | `/api/v1/itsm/sla-policies/{id}` | `SLAHandler.UpdatePolicy` | `itsm.manage` | Active |
| DELETE | `/api/v1/itsm/sla-policies/{id}` | `SLAHandler.DeletePolicy` | `itsm.manage` | Active |
| GET | `/api/v1/itsm/business-hours` | `SLAHandler.ListCalendars` | `itsm.view` | Active |
| GET | `/api/v1/itsm/business-hours/{id}` | `SLAHandler.GetCalendar` | `itsm.view` | Active |
| POST | `/api/v1/itsm/business-hours` | `SLAHandler.CreateCalendar` | `itsm.manage` | Active |
| PUT | `/api/v1/itsm/business-hours/{id}` | `SLAHandler.UpdateCalendar` | `itsm.manage` | Active |
| DELETE | `/api/v1/itsm/business-hours/{id}` | `SLAHandler.DeleteCalendar` | `itsm.manage` | Active |
| GET | `/api/v1/itsm/escalation-rules` | `SLAHandler.ListEscalationRules` | `itsm.view` | Active |
| GET | `/api/v1/itsm/escalation-rules/{id}` | `SLAHandler.GetEscalationRule` | `itsm.view` | Active |
| POST | `/api/v1/itsm/escalation-rules` | `SLAHandler.CreateEscalationRule` | `itsm.manage` | Active |
| PUT | `/api/v1/itsm/escalation-rules/{id}` | `SLAHandler.UpdateEscalationRule` | `itsm.manage` | Active |
| DELETE | `/api/v1/itsm/escalation-rules/{id}` | `SLAHandler.DeleteEscalationRule` | `itsm.manage` | Active |
| GET | `/api/v1/itsm/sla-compliance` | `SLAHandler.GetComplianceStats` | `itsm.view` | Active |
| GET | `/api/v1/itsm/sla-breaches/{ticketId}` | `SLAHandler.ListBreaches` | `itsm.view` | Active |

#### Problems

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/itsm/problems` | `ProblemHandler.List` | `itsm.view` | Yes | Active |
| GET | `/api/v1/itsm/problems/{id}` | `ProblemHandler.Get` | `itsm.view` | No | Active |
| POST | `/api/v1/itsm/problems` | `ProblemHandler.Create` | `itsm.manage` | No | Active |
| PUT | `/api/v1/itsm/problems/{id}` | `ProblemHandler.Update` | `itsm.manage` | No | Active |
| DELETE | `/api/v1/itsm/problems/{id}` | `ProblemHandler.Delete` | `itsm.manage` | No | Active |

#### Queues

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/itsm/queues` | `QueueHandler.ListQueues` | `itsm.view` | Active |
| GET | `/api/v1/itsm/queues/{id}` | `QueueHandler.GetQueue` | `itsm.view` | Active |
| POST | `/api/v1/itsm/queues` | `QueueHandler.CreateQueue` | `itsm.manage` | Active |
| PUT | `/api/v1/itsm/queues/{id}` | `QueueHandler.UpdateQueue` | `itsm.manage` | Active |
| DELETE | `/api/v1/itsm/queues/{id}` | `QueueHandler.DeleteQueue` | `itsm.manage` | Active |

### 5.8 CMDB Module (Auth + Audit, NO per-handler RBAC)

#### Assets

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/cmdb/assets` | `AssetHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/cmdb/assets/{id}` | `AssetHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/cmdb/assets` | `AssetHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/cmdb/assets/{id}` | `AssetHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/cmdb/assets/{id}` | `AssetHandler.Delete` | **MISSING** | No | Active |
| POST | `/api/v1/cmdb/assets/{id}/dispose` | `AssetHandler.Dispose` | **MISSING** | No | Active |
| GET | `/api/v1/cmdb/assets/{id}/history` | `AssetHandler.History` | **MISSING** | No | Active |

#### Configuration Items

| Method | Path | Handler | RBAC | Status |
|--------|------|---------|------|--------|
| GET | `/api/v1/cmdb/cis` | `CMDBCIHandler.List` | **MISSING** | Active |
| GET | `/api/v1/cmdb/cis/{id}` | `CMDBCIHandler.Get` | **MISSING** | Active |
| POST | `/api/v1/cmdb/cis` | `CMDBCIHandler.Create` | **MISSING** | Active |
| PUT | `/api/v1/cmdb/cis/{id}` | `CMDBCIHandler.Update` | **MISSING** | Active |
| DELETE | `/api/v1/cmdb/cis/{id}` | `CMDBCIHandler.Delete` | **MISSING** | Active |
| GET | `/api/v1/cmdb/cis/{id}/relationships` | `CMDBCIHandler.ListRelationships` | **MISSING** | Active |
| POST | `/api/v1/cmdb/cis/{id}/relationships` | `CMDBCIHandler.AddRelationship` | **MISSING** | Active |
| DELETE | `/api/v1/cmdb/cis/relationships/{id}` | `CMDBCIHandler.RemoveRelationship` | **MISSING** | Active |

#### Licenses

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/cmdb/licenses` | `LicenseHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/cmdb/licenses/{id}` | `LicenseHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/cmdb/licenses` | `LicenseHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/cmdb/licenses/{id}` | `LicenseHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/cmdb/licenses/{id}` | `LicenseHandler.Delete` | **MISSING** | No | Active |

#### Warranties & Renewal Alerts

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/cmdb/warranties` | `WarrantyHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/cmdb/warranties/{id}` | `WarrantyHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/cmdb/warranties` | `WarrantyHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/cmdb/warranties/{id}` | `WarrantyHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/cmdb/warranties/{id}` | `WarrantyHandler.Delete` | **MISSING** | No | Active |
| GET | `/api/v1/cmdb/renewal-alerts` | `WarrantyHandler.ListAlerts` | **MISSING** | Yes | Active |
| PUT | `/api/v1/cmdb/renewal-alerts/{id}/acknowledge` | `WarrantyHandler.AckAlert` | **MISSING** | No | Active |

### 5.9 People Module (Auth + Audit, per-handler RBAC)

#### Skills

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/people/skills/categories` | `SkillHandler.ListSkillCategories` | `people.view` | Active |
| GET | `/api/v1/people/skills/categories/{id}` | `SkillHandler.GetSkillCategory` | `people.view` | Active |
| POST | `/api/v1/people/skills/categories` | `SkillHandler.CreateSkillCategory` | `people.manage` | Active |
| PUT | `/api/v1/people/skills/categories/{id}` | `SkillHandler.UpdateSkillCategory` | `people.manage` | Active |
| DELETE | `/api/v1/people/skills/categories/{id}` | `SkillHandler.DeleteSkillCategory` | `people.manage` | Active |
| GET | `/api/v1/people/skills` | `SkillHandler.ListSkills` | `people.view` | Active |
| GET | `/api/v1/people/skills/{id}` | `SkillHandler.GetSkill` | `people.view` | Active |
| POST | `/api/v1/people/skills` | `SkillHandler.CreateSkill` | `people.manage` | Active |
| PUT | `/api/v1/people/skills/{id}` | `SkillHandler.UpdateSkill` | `people.manage` | Active |
| DELETE | `/api/v1/people/skills/{id}` | `SkillHandler.DeleteSkill` | `people.manage` | Active |
| GET | `/api/v1/people/skills/user-skills/{userId}` | `SkillHandler.ListUserSkills` | `people.view` | Active |
| GET | `/api/v1/people/skills/user-skills/by-skill/{skillId}` | `SkillHandler.ListUsersBySkill` | `people.view` | Active |
| POST | `/api/v1/people/skills/user-skills` | `SkillHandler.CreateUserSkill` | `people.manage` | Active |
| PUT | `/api/v1/people/skills/user-skills/{id}` | `SkillHandler.UpdateUserSkill` | `people.manage` | Active |
| DELETE | `/api/v1/people/skills/user-skills/{id}` | `SkillHandler.DeleteUserSkill` | `people.manage` | Active |
| PUT | `/api/v1/people/skills/user-skills/{id}/verify` | `SkillHandler.VerifyUserSkill` | `people.manage` | Active |
| GET | `/api/v1/people/skills/requirements/{roleType}` | `SkillHandler.ListRoleSkillRequirements` | `people.view` | Active |
| GET | `/api/v1/people/skills/requirements/{roleType}/gap/{userId}` | `SkillHandler.GetSkillGapAnalysis` | `people.view` | Active |

#### Checklists

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/people/checklists/templates` | `ChecklistHandler.ListChecklistTemplates` | `people.view` | Active |
| GET | `/api/v1/people/checklists/templates/{id}` | `ChecklistHandler.GetChecklistTemplate` | `people.view` | Active |
| POST | `/api/v1/people/checklists/templates` | `ChecklistHandler.CreateChecklistTemplate` | `people.manage` | Active |
| PUT | `/api/v1/people/checklists/templates/{id}` | `ChecklistHandler.UpdateChecklistTemplate` | `people.manage` | Active |
| DELETE | `/api/v1/people/checklists/templates/{id}` | `ChecklistHandler.DeleteChecklistTemplate` | `people.manage` | Active |
| GET | `/api/v1/people/checklists` | `ChecklistHandler.ListChecklists` | `people.view` | Active |
| GET | `/api/v1/people/checklists/{id}` | `ChecklistHandler.GetChecklist` | `people.view` | Active |
| POST | `/api/v1/people/checklists` | `ChecklistHandler.CreateChecklist` | `people.manage` | Active |
| PUT | `/api/v1/people/checklists/{id}/status` | `ChecklistHandler.UpdateChecklistStatus` | `people.manage` | Active |
| DELETE | `/api/v1/people/checklists/{id}` | `ChecklistHandler.DeleteChecklist` | `people.manage` | Active |
| GET | `/api/v1/people/checklists/tasks/{checklistId}` | `ChecklistHandler.ListChecklistTasks` | `people.view` | Active |
| POST | `/api/v1/people/checklists/tasks` | `ChecklistHandler.CreateChecklistTask` | `people.manage` | Active |
| GET | `/api/v1/people/checklists/tasks/item/{id}` | `ChecklistHandler.GetChecklistTask` | `people.view` | Active |
| PUT | `/api/v1/people/checklists/tasks/item/{id}` | `ChecklistHandler.UpdateChecklistTask` | `people.manage` | Active |
| PUT | `/api/v1/people/checklists/tasks/item/{id}/complete` | `ChecklistHandler.CompleteChecklistTask` | `people.manage` | Active |
| DELETE | `/api/v1/people/checklists/tasks/item/{id}` | `ChecklistHandler.DeleteChecklistTask` | `people.manage` | Active |

#### Rosters, Leave, Capacity

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/people/rosters` | `RosterHandler.ListRosters` | `people.view` | Active |
| GET | `/api/v1/people/rosters/{id}` | `RosterHandler.GetRoster` | `people.view` | Active |
| POST | `/api/v1/people/rosters` | `RosterHandler.CreateRoster` | `people.manage` | Active |
| PUT | `/api/v1/people/rosters/{id}` | `RosterHandler.UpdateRoster` | `people.manage` | Active |
| GET | `/api/v1/people/leave` | `RosterHandler.ListLeaveRecords` | `people.view` | Active |
| GET | `/api/v1/people/leave/{id}` | `RosterHandler.GetLeaveRecord` | `people.view` | Active |
| POST | `/api/v1/people/leave` | `RosterHandler.CreateLeaveRecord` | `people.manage` | Active |
| PUT | `/api/v1/people/leave/{id}/status` | `RosterHandler.UpdateLeaveRecordStatus` | `people.manage` | Active |
| DELETE | `/api/v1/people/leave/{id}` | `RosterHandler.DeleteLeaveRecord` | `people.manage` | Active |
| GET | `/api/v1/people/capacity` | `RosterHandler.ListCapacityAllocations` | `people.view` | Active |
| POST | `/api/v1/people/capacity` | `RosterHandler.CreateCapacityAllocation` | `people.manage` | Active |
| PUT | `/api/v1/people/capacity/{id}` | `RosterHandler.UpdateCapacityAllocation` | `people.manage` | Active |
| DELETE | `/api/v1/people/capacity/{id}` | `RosterHandler.DeleteCapacityAllocation` | `people.manage` | Active |
| GET | `/api/v1/people/capacity/heatmap` | `HeatmapHandler.GetHeatmap` | `people.view` | Active |
| GET | `/api/v1/people/capacity/allocations` | `HeatmapHandler.ListAllocations` | `people.view` | Active |
| POST | `/api/v1/people/capacity/allocations` | `HeatmapHandler.CreateAllocation` | `people.manage` | Active |
| PUT | `/api/v1/people/capacity/allocations/{id}` | `HeatmapHandler.UpdateAllocation` | `people.manage` | Active |
| DELETE | `/api/v1/people/capacity/allocations/{id}` | `HeatmapHandler.DeleteAllocation` | `people.manage` | Active |

#### Training

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/people/training` | `TrainingHandler.List` | `people.view` | Active |
| GET | `/api/v1/people/training/{id}` | `TrainingHandler.Get` | `people.view` | Active |
| POST | `/api/v1/people/training` | `TrainingHandler.Create` | `people.manage` | Active |
| PUT | `/api/v1/people/training/{id}` | `TrainingHandler.Update` | `people.manage` | Active |
| DELETE | `/api/v1/people/training/{id}` | `TrainingHandler.Delete` | `people.manage` | Active |

### 5.10 Knowledge Module (Auth + Audit, per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/knowledge/articles` | `ArticleHandler.List` | `knowledge.view` | Active |
| GET | `/api/v1/knowledge/articles/{id}` | `ArticleHandler.Get` | `knowledge.view` | Active |
| GET | `/api/v1/knowledge/articles/by-slug/{slug}` | `ArticleHandler.GetBySlug` | `knowledge.view` | Active |
| POST | `/api/v1/knowledge/articles` | `ArticleHandler.Create` | `knowledge.manage` | Active |
| PUT | `/api/v1/knowledge/articles/{id}` | `ArticleHandler.Update` | `knowledge.manage` | Active |
| DELETE | `/api/v1/knowledge/articles/{id}` | `ArticleHandler.Delete` | `knowledge.manage` | Active |
| GET | `/api/v1/knowledge/articles/{articleId}/feedback` | `FeedbackHandler.ListFeedback` | `knowledge.view` | Active |
| GET | `/api/v1/knowledge/articles/{articleId}/feedback/stats` | `FeedbackHandler.GetFeedbackStats` | `knowledge.view` | Active |
| POST | `/api/v1/knowledge/articles/{articleId}/feedback` | `FeedbackHandler.CreateFeedback` | `knowledge.view` | Active |
| DELETE | `/api/v1/knowledge/articles/{articleId}/feedback/{id}` | `FeedbackHandler.DeleteFeedback` | `knowledge.manage` | Active |
| GET | `/api/v1/knowledge/announcements` | `AnnouncementHandler.List` | `knowledge.view` | Active |
| GET | `/api/v1/knowledge/announcements/{id}` | `AnnouncementHandler.Get` | `knowledge.view` | Active |
| POST | `/api/v1/knowledge/announcements` | `AnnouncementHandler.Create` | `knowledge.manage` | Active |
| PUT | `/api/v1/knowledge/announcements/{id}` | `AnnouncementHandler.Update` | `knowledge.manage` | Active |
| DELETE | `/api/v1/knowledge/announcements/{id}` | `AnnouncementHandler.Delete` | `knowledge.manage` | Active |

### 5.11 GRC Module (Auth + Audit, NO per-handler RBAC)

#### Risk Management

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/grc/risks` | `RiskHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/grc/risks/{id}` | `RiskHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/grc/risks` | `RiskHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/grc/risks/{id}` | `RiskHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/grc/risks/{id}` | `RiskHandler.Delete` | **MISSING** | No | Active |

#### Audit Management

| Method | Path | Handler | RBAC | Status |
|--------|------|---------|------|--------|
| GET | `/api/v1/grc/audits` | `AuditMgmtHandler.List` | **MISSING** | Active |
| GET | `/api/v1/grc/audits/{id}` | `AuditMgmtHandler.Get` | **MISSING** | Active |
| POST | `/api/v1/grc/audits` | `AuditMgmtHandler.Create` | **MISSING** | Active |
| PUT | `/api/v1/grc/audits/{id}` | `AuditMgmtHandler.Update` | **MISSING** | Active |
| POST | `/api/v1/grc/audits/{id}/findings` | `AuditMgmtHandler.AddFinding` | **MISSING** | Active |
| PUT | `/api/v1/grc/audits/{id}/findings/{fid}` | `AuditMgmtHandler.UpdateFinding` | **MISSING** | Active |
| POST | `/api/v1/grc/audits/{id}/evidence` | `AuditMgmtHandler.AddEvidence` | **MISSING** | Active |
| GET | `/api/v1/grc/audits/{id}/evidence` | `AuditMgmtHandler.ListEvidence` | **MISSING** | Active |

#### Access Reviews

| Method | Path | Handler | RBAC | Status |
|--------|------|---------|------|--------|
| GET | `/api/v1/grc/access-reviews` | `AccessReviewHandler.List` | **MISSING** | Active |
| GET | `/api/v1/grc/access-reviews/{id}` | `AccessReviewHandler.Get` | **MISSING** | Active |
| POST | `/api/v1/grc/access-reviews` | `AccessReviewHandler.Create` | **MISSING** | Active |
| PUT | `/api/v1/grc/access-reviews/{id}` | `AccessReviewHandler.Update` | **MISSING** | Active |
| POST | `/api/v1/grc/access-reviews/{id}/decisions` | `AccessReviewHandler.AddDecision` | **MISSING** | Active |

#### Compliance

| Method | Path | Handler | RBAC | Status |
|--------|------|---------|------|--------|
| GET | `/api/v1/grc/compliance` | `ComplianceHandler.List` | **MISSING** | Active |
| GET | `/api/v1/grc/compliance/{id}` | `ComplianceHandler.Get` | **MISSING** | Active |
| POST | `/api/v1/grc/compliance` | `ComplianceHandler.Create` | **MISSING** | Active |
| PUT | `/api/v1/grc/compliance/{id}` | `ComplianceHandler.Update` | **MISSING** | Active |
| DELETE | `/api/v1/grc/compliance/{id}` | `ComplianceHandler.Delete` | **MISSING** | Active |

### 5.12 Reporting Module (Auth + Audit, NO per-handler RBAC)

| Method | Path | Handler | RBAC | Pagination | Status |
|--------|------|---------|------|------------|--------|
| GET | `/api/v1/reporting/dashboards` | `DashboardHandler.List` | **MISSING** | No | Active |
| GET | `/api/v1/reporting/dashboards/executive-summary` | `DashboardHandler.ExecutiveSummary` | **MISSING** | No | Active |
| GET | `/api/v1/reporting/dashboards/{id}` | `DashboardHandler.Get` | **MISSING** | No | Active |
| GET | `/api/v1/reporting/reports` | `ReportHandler.List` | **MISSING** | Yes | Active |
| GET | `/api/v1/reporting/reports/{id}` | `ReportHandler.Get` | **MISSING** | No | Active |
| POST | `/api/v1/reporting/reports` | `ReportHandler.Create` | **MISSING** | No | Active |
| PUT | `/api/v1/reporting/reports/{id}` | `ReportHandler.Update` | **MISSING** | No | Active |
| DELETE | `/api/v1/reporting/reports/{id}` | `ReportHandler.Delete` | **MISSING** | No | Active |
| POST | `/api/v1/reporting/reports/{id}/run` | `ReportHandler.RunReport` | **MISSING** | No | Active |
| GET | `/api/v1/reporting/search` | `SearchHandler.Search` | **MISSING** | Yes | Active |
| GET | `/api/v1/dashboards/*` | (alias routes) | **MISSING** | -- | Active |
| GET | `/api/v1/search/*` | (alias routes) | **MISSING** | -- | Active |

### 5.13 System Module (Auth + Audit + RBAC: system.view / system.manage)

**Read-only group (system.view):**

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/system/health/*` | `SystemHealthHandler.*` | `system.view` | Active |
| GET | `/api/v1/system/audit-logs/*` | `AuditExplorerHandler.*` | `system.view` | Active |
| GET | `/api/v1/system/permissions` | `RoleHandler.GetPermissionCatalog` | `system.view` | Active |

**Admin group (system.manage):**

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET/POST/PUT/DELETE | `/api/v1/system/users/*` | `UserHandler.*` | `system.manage` | Active |
| GET/POST/PUT/DELETE | `/api/v1/system/roles/*` | `RoleHandler.*` | `system.manage` | Active |
| GET/POST/PUT/DELETE | `/api/v1/system/tenants/*` | `TenantHandler.*` | `system.manage` | Active |
| GET/POST/PUT/DELETE | `/api/v1/system/org-units/*` | `OrgHandler.*` | `system.manage` | Active |
| GET/POST/PUT/DELETE | `/api/v1/system/sessions/*` | `SessionHandler.*` | `system.manage` | Active |
| GET/POST/PUT/DELETE | `/api/v1/system/settings/*` | `SettingsHandler.*` | `system.manage` | Active |
| GET/POST/PUT/DELETE | `/api/v1/system/email-templates/*` | `EmailTemplateHandler.*` | `system.manage` | Active |

### 5.14 Approvals Module (Auth + Audit + per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/approvals/workflows` | `Handler.ListWorkflowDefinitions` | `approval.manage` | No | Active |
| POST | `/api/v1/approvals/workflows` | `Handler.CreateWorkflowDefinition` | `approval.manage` | No | Active |
| GET | `/api/v1/approvals/workflows/{id}` | `Handler.GetWorkflowDefinition` | `approval.manage` | No | Active |
| PUT | `/api/v1/approvals/workflows/{id}` | `Handler.UpdateWorkflowDefinition` | `approval.manage` | No | Active |
| DELETE | `/api/v1/approvals/workflows/{id}` | `Handler.DeleteWorkflowDefinition` | `approval.manage` | No | Active |
| POST | `/api/v1/approvals/chains` | `Handler.StartApproval` | `approval.manage` | No | Active |
| GET | `/api/v1/approvals/chains/{id}` | `Handler.GetApprovalChain` | `approval.view` | No | Active |
| POST | `/api/v1/approvals/chains/{id}/cancel` | `Handler.CancelChain` | `approval.manage` | No | Active |
| GET | `/api/v1/approvals/my-pending` | `Handler.GetMyPendingApprovals` | `approval.view` | Yes | Active |
| GET | `/api/v1/approvals/my-pending/count` | `Handler.CountMyPendingApprovals` | `approval.view` | No | Active |
| POST | `/api/v1/approvals/steps/{id}/decide` | `Handler.ProcessDecision` | None (auth-only) | No | Active |
| POST | `/api/v1/approvals/steps/{id}/delegate` | `Handler.DelegateStep` | None (auth-only) | No | Active |
| GET | `/api/v1/approvals/entity/{entityType}/{entityId}` | `Handler.GetApprovalChainForEntity` | `approval.view` | No | Active |
| GET | `/api/v1/approvals/history` | `Handler.GetApprovalHistory` | `approval.view` | Yes | Active |

### 5.15 Calendar Module (Auth + Audit + per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/calendar/events` | `Handler.GetCalendarEvents` | `planning.view` | Active |
| POST | `/api/v1/calendar/maintenance-windows` | `Handler.CreateMaintenanceWindow` | `planning.manage` | Active |
| GET | `/api/v1/calendar/maintenance-windows/{id}` | `Handler.GetMaintenanceWindow` | `planning.view` | Active |
| PUT | `/api/v1/calendar/maintenance-windows/{id}` | `Handler.UpdateMaintenanceWindow` | `planning.manage` | Active |
| DELETE | `/api/v1/calendar/maintenance-windows/{id}` | `Handler.DeleteMaintenanceWindow` | `planning.manage` | Active |
| POST | `/api/v1/calendar/freeze-periods` | `Handler.CreateFreezePeriod` | `planning.manage` | Active |
| GET | `/api/v1/calendar/freeze-periods` | `Handler.ListFreezePeriods` | `planning.view` | Active |
| DELETE | `/api/v1/calendar/freeze-periods/{id}` | `Handler.DeleteFreezePeriod` | `planning.manage` | Active |
| GET | `/api/v1/calendar/conflicts` | `Handler.CheckConflicts` | `planning.view` | Active |

### 5.16 Vault Module (Auth + Audit + per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/vault/documents` | `Handler.ListDocuments` | `documents.view` | Yes | Active |
| POST | `/api/v1/vault/documents` | `Handler.UploadDocument` (multipart) | `documents.manage` | No | Active |
| GET | `/api/v1/vault/documents/{id}` | `Handler.GetDocument` | `documents.view` | No | Active |
| PUT | `/api/v1/vault/documents/{id}` | `Handler.UpdateDocument` | `documents.manage` | No | Active |
| DELETE | `/api/v1/vault/documents/{id}` | `Handler.DeleteDocument` | `documents.manage` | No | Active |
| GET | `/api/v1/vault/documents/{id}/download` | `Handler.GetDownloadURL` | `documents.view` | No | Active |
| POST | `/api/v1/vault/documents/{id}/version` | `Handler.UploadVersion` (multipart) | `documents.manage` | No | Active |
| GET | `/api/v1/vault/documents/{id}/versions` | `Handler.ListVersions` | `documents.view` | No | Active |
| POST | `/api/v1/vault/documents/{id}/lock` | `Handler.LockDocument` | `documents.manage` | No | Active |
| POST | `/api/v1/vault/documents/{id}/unlock` | `Handler.UnlockDocument` | `documents.manage` | No | Active |
| POST | `/api/v1/vault/documents/{id}/move` | `Handler.MoveDocument` | `documents.manage` | No | Active |
| POST | `/api/v1/vault/documents/{id}/share` | `Handler.ShareDocument` | `documents.manage` | No | Active |
| GET | `/api/v1/vault/documents/{id}/access-log` | `Handler.GetAccessLog` | `documents.view` | Yes | Active |
| GET | `/api/v1/vault/folders` | `Handler.ListFolders` | `documents.view` | No | Active |
| POST | `/api/v1/vault/folders` | `Handler.CreateFolder` | `documents.manage` | No | Active |
| PUT | `/api/v1/vault/folders/{id}` | `Handler.UpdateFolder` | `documents.manage` | No | Active |
| DELETE | `/api/v1/vault/folders/{id}` | `Handler.DeleteFolder` | `documents.manage` | No | Active |
| GET | `/api/v1/vault/search` | `Handler.SearchDocuments` | `documents.view` | Yes | Active |
| GET | `/api/v1/vault/recent` | `Handler.GetRecentDocuments` | `documents.view` | No | Active |
| GET | `/api/v1/vault/stats` | `Handler.GetStats` | `documents.view` | No | Active |

### 5.17 Vendors Module (Auth + Audit + per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/vendors` | `Handler.ListVendors` | `vendor.view` | Yes | Active |
| POST | `/api/v1/vendors` | `Handler.CreateVendor` | `vendor.manage` | No | Active |
| GET | `/api/v1/vendors/{id}` | `Handler.GetVendor` | `vendor.view` | No | Active |
| PUT | `/api/v1/vendors/{id}` | `Handler.UpdateVendor` | `vendor.manage` | No | Active |
| DELETE | `/api/v1/vendors/{id}` | `Handler.DeleteVendor` | `vendor.manage` | No | Active |
| GET | `/api/v1/vendors/{id}/contracts` | `Handler.ListVendorContracts` | `vendor.view` | Yes | Active |
| GET | `/api/v1/vendors/{id}/scorecards` | `Handler.ListVendorScorecards` | `vendor.view` | No | Active |
| GET | `/api/v1/vendors/{id}/summary` | `Handler.GetVendorSummary` | `vendor.view` | No | Active |
| GET | `/api/v1/vendors/contracts` | `Handler.ListContracts` | `vendor.view` | Yes | Active |
| POST | `/api/v1/vendors/contracts` | `Handler.CreateContract` | `vendor.manage` | No | Active |
| GET | `/api/v1/vendors/contracts/expiring` | `Handler.ListExpiringContracts` | `vendor.view` | No | Active |
| GET | `/api/v1/vendors/contracts/dashboard` | `Handler.GetContractDashboard` | `vendor.view` | No | Active |
| GET | `/api/v1/vendors/contracts/{id}` | `Handler.GetContract` | `vendor.view` | No | Active |
| PUT | `/api/v1/vendors/contracts/{id}` | `Handler.UpdateContract` | `vendor.manage` | No | Active |
| DELETE | `/api/v1/vendors/contracts/{id}` | `Handler.DeleteContract` | `vendor.manage` | No | Active |
| POST | `/api/v1/vendors/contracts/{id}/renew` | `Handler.RenewContract` | `vendor.manage` | No | Active |
| POST | `/api/v1/vendors/scorecards` | `Handler.CreateScorecard` | `vendor.manage` | No | Active |
| GET | `/api/v1/vendors/scorecards/{id}` | `Handler.GetScorecard` | `vendor.view` | No | Active |
| PUT | `/api/v1/vendors/scorecards/{id}` | `Handler.UpdateScorecard` | `vendor.manage` | No | Active |

### 5.18 Automation Module (Auth + Audit + per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Pagination | Status |
|--------|------|---------|----------------|------------|--------|
| GET | `/api/v1/automation/rules` | `Handler.ListRules` | `automation.view` | Yes | Active |
| POST | `/api/v1/automation/rules` | `Handler.CreateRule` | `automation.manage` | No | Active |
| GET | `/api/v1/automation/rules/{id}` | `Handler.GetRule` | `automation.view` | No | Active |
| PUT | `/api/v1/automation/rules/{id}` | `Handler.UpdateRule` | `automation.manage` | No | Active |
| DELETE | `/api/v1/automation/rules/{id}` | `Handler.DeleteRule` | `automation.manage` | No | Active |
| POST | `/api/v1/automation/rules/{id}/toggle` | `Handler.ToggleRule` | `automation.manage` | No | Active |
| POST | `/api/v1/automation/rules/{id}/test` | `Handler.TestRule` | `automation.manage` | No | Active |
| GET | `/api/v1/automation/rules/{id}/executions` | `Handler.ListRuleExecutions` | `automation.view` | Yes | Active |
| GET | `/api/v1/automation/executions` | `Handler.ListAllExecutions` | `automation.view` | Yes | Active |
| GET | `/api/v1/automation/stats` | `Handler.GetStats` | `automation.view` | No | Active |

### 5.19 Custom Fields Module (Auth + Audit + per-handler RBAC)

| Method | Path | Handler | RBAC Permission | Status |
|--------|------|---------|----------------|--------|
| GET | `/api/v1/custom-fields/definitions` | `Handler.ListDefinitions` | `custom_fields.manage` | Active |
| POST | `/api/v1/custom-fields/definitions` | `Handler.CreateDefinition` | `custom_fields.manage` | Active |
| POST | `/api/v1/custom-fields/definitions/reorder` | `Handler.ReorderDefinitions` | `custom_fields.manage` | Active |
| GET | `/api/v1/custom-fields/definitions/{id}` | `Handler.GetDefinition` | `custom_fields.manage` | Active |
| PUT | `/api/v1/custom-fields/definitions/{id}` | `Handler.UpdateDefinition` | `custom_fields.manage` | Active |
| DELETE | `/api/v1/custom-fields/definitions/{id}` | `Handler.DeleteDefinition` | `custom_fields.manage` | Active |
| GET | `/api/v1/custom-fields/entity/{entityType}/{entityId}/values` | `Handler.GetValues` | `custom_fields.manage` | Active |
| PUT | `/api/v1/custom-fields/entity/{entityType}/{entityId}/values` | `Handler.UpdateValues` | `custom_fields.manage` | Active |

### 5.20 Directory Sync (Conditional, admin-only)

| Method | Path | Handler | Condition | Status |
|--------|------|---------|-----------|--------|
| POST | `/api/v1/admin/directory-sync/run` | Inline handler | Only if `graphClient != nil` | Conditional |
| GET | `/api/v1/admin/directory-sync/status` | Inline handler | Only if `graphClient != nil` | Conditional |

---

## 6. RBAC Enforcement Summary

### 6.1 Modules WITH per-handler RBAC

| Module | Permission Prefix | Evidence |
|--------|------------------|----------|
| ITSM | `itsm.view`, `itsm.manage` | All sub-handlers use `middleware.RequirePermission` |
| People | `people.view`, `people.manage` | All sub-handlers use `middleware.RequirePermission` |
| Knowledge | `knowledge.view`, `knowledge.manage` | All sub-handlers use `middleware.RequirePermission` |
| System | `system.view`, `system.manage` | Group-level RBAC in `system/handler.go` |
| Approvals | `approval.view`, `approval.manage` | Per-route RBAC |
| Calendar | `planning.view`, `planning.manage` | Per-route RBAC |
| Vault | `documents.view`, `documents.manage` | Per-route RBAC |
| Vendors | `vendor.view`, `vendor.manage` | Per-route RBAC |
| Automation | `automation.view`, `automation.manage` | Per-route RBAC |
| Custom Fields | `custom_fields.manage` | Per-route RBAC |

### 6.2 Modules WITHOUT per-handler RBAC (SECURITY GAP)

| Module | Current Auth Level | Risk | Recommended Fix |
|--------|-------------------|------|-----------------|
| **Governance** | Auth-only (any authenticated user) | **HIGH** -- Any user can create/edit/delete policies, OKRs, meetings | Add `governance.view` / `governance.manage` |
| **Planning** | Auth-only (any authenticated user) | **HIGH** -- Any user can create/edit/delete projects, risks, budgets | Add `planning.view` / `planning.manage` |
| **CMDB** | Auth-only (any authenticated user) | **HIGH** -- Any user can create/edit/delete assets, CIs, licenses | Add `cmdb.view` / `cmdb.manage` |
| **GRC** | Auth-only (any authenticated user) | **HIGH** -- Any user can create/edit/delete GRC risks, audits, compliance | Add `grc.view` / `grc.manage` |
| **Reporting** | Auth-only (any authenticated user) | **MEDIUM** -- Read-only is acceptable, but report creation needs gating | Add `reporting.manage` for writes |

---

## 7. Request Validation Patterns

### 7.1 Validation Approaches by Module

| Module | Validation Method | Evidence |
|--------|------------------|----------|
| Planning | Go struct tags (`validate:"required"`) + handler-level checks | `planning/types.go` |
| ITSM | Handler-level JSON decode + manual field checks | Various handlers |
| Approvals | Handler-level JSON decode + manual field checks | `approval/handler.go` |
| Calendar | Handler-level validation (required fields, time range) | `calendar/handler.go` |
| Vault | Handler-level multipart parsing + field validation | `vault/handler.go` |
| Vendors | Handler-level JSON decode + required field checks | `vendor/handler.go` |
| Automation | Handler-level JSON decode + required field checks | `automation/handler.go` |
| Custom Fields | Handler-level JSON decode + required field checks | `customfields/handler.go` |

### 7.2 Validation Consistency

All handlers follow a consistent pattern:
1. Extract `AuthContext` from request context (return 401 if nil)
2. Parse request body via `json.NewDecoder(r.Body).Decode()`
3. Validate required fields (return 400 with `VALIDATION_ERROR` code)
4. Call service method
5. Return standardized response envelope

**Gap:** No centralized validation middleware. Each handler implements its own validation. Consider a shared validation helper or middleware using the `validate` struct tags.

---

## 8. Pagination & Filtering Support

### 8.1 Pagination

Standard pagination parameters parsed via `types.ParsePagination(r)`:
- `page` (default: 1)
- `limit` (default: 20)

Response envelope includes `meta` with: `page`, `limit`, `total`, `totalPages`.

### 8.2 Modules with Pagination

| Module | List Endpoints | Pagination | Evidence |
|--------|---------------|------------|----------|
| Governance | policies, raci, meetings, okrs, kpis | Yes | Handler code |
| Planning | portfolios, projects, work-items, milestones, risks, issues, CRs | Yes | Handler code |
| ITSM | tickets, problems, catalog items | Yes | Handler code |
| CMDB | assets, licenses, warranties, renewal-alerts | Yes | Handler code |
| People | skills, checklists, training | Partial | Some lists are non-paginated |
| Knowledge | articles | Yes | Handler code |
| GRC | risks, audits, access-reviews, compliance | Yes | Handler code |
| Reporting | reports | Yes | Handler code |
| Vault | documents, access-log | Yes | Handler code |
| Vendors | vendors, contracts | Yes | Handler code |
| Automation | rules, executions | Yes | Handler code |
| Approvals | my-pending, history | Yes | Handler code |

---

## 9. Background Services

| Service | Interval | Purpose | Evidence |
|---------|----------|---------|----------|
| `OutboxProcessor` | Continuous | Process notification outbox queue | `notification/outbox.go` |
| `Orchestrator` | NATS-driven | Listen for events, create notifications | `notification/sse.go` |
| `DashboardRefresher` | 5 minutes | Refresh cached dashboard data | `reporting/dashboard_refresher.go` |
| `ReportScheduler` | 1 minute | Check and execute scheduled reports | `reporting/report_scheduler.go` |
| `MaintenanceWorker` | Background | Session cleanup, data maintenance | `system/maintenance_worker.go` |
| `ActionReminderService` | 1 hour | Send reminders for overdue governance actions | `governance/action_reminder.go` |

---

## 10. Server Configuration

| Setting | Value | Evidence |
|---------|-------|----------|
| Read Timeout | 15 seconds | `server.go` line 366 |
| Read Header Timeout | 5 seconds | `server.go` line 367 |
| Write Timeout | 0 (disabled for SSE) | `server.go` line 368 |
| Idle Timeout | 60 seconds | `server.go` line 369 |
| Graceful Shutdown | 30 seconds | `server.go` line 402 |
| Rate Limit | 100 req/min per IP | `server.go` line 110 |
| CORS Max Age | 300 seconds (5 min) | `server.go` line 102 |

---

## 11. Known Issues and Recommendations

| # | Issue | Severity | Module(s) | Recommendation |
|---|-------|----------|-----------|----------------|
| 1 | **RBAC missing on Governance module** | HIGH | Governance | Add `middleware.RequirePermission("governance.view/manage")` to all policy, RACI, meeting, OKR handlers |
| 2 | **RBAC missing on Planning module** | HIGH | Planning | Add `middleware.RequirePermission("planning.view/manage")` to all portfolio, project, work-item handlers |
| 3 | **RBAC missing on CMDB module** | HIGH | CMDB | Add `middleware.RequirePermission("cmdb.view/manage")` to all asset, CI, license, warranty handlers |
| 4 | **RBAC missing on GRC module** | HIGH | GRC | Add `middleware.RequirePermission("grc.view/manage")` to all risk, audit, compliance handlers |
| 5 | **RBAC missing on Reporting module** | MEDIUM | Reporting | Add `middleware.RequirePermission("reporting.manage")` to write endpoints |
| 6 | No centralized request validation middleware | MEDIUM | All | Consider shared validation layer using struct tags |
| 7 | Write timeout disabled globally for SSE | LOW | Platform | Consider enabling write timeout on non-SSE routes |
| 8 | Some People module lists are non-paginated | LOW | People | Add pagination to roster, leave, capacity list endpoints |
| 9 | Audit handler returns 500 on query errors (no AppError wrapping) | LOW | Audit | Use `writeAppError` pattern for consistent error handling |
| 10 | Directory sync endpoints lack RBAC | MEDIUM | Admin | Add `system.manage` permission requirement |

---

## 12. Endpoint Count Summary

| Category | Count |
|----------|-------|
| Public routes (no auth) | 7 |
| Protected auth routes | 2 |
| Audit module | 3 |
| Notification module | 7 |
| Governance module | ~30 |
| Planning module | ~55 |
| ITSM module | ~40 |
| CMDB module | ~25 |
| People module | ~45 |
| Knowledge module | ~15 |
| GRC module | ~20 |
| Reporting module | ~12 |
| System module | ~30 |
| Approvals module | 14 |
| Calendar module | 9 |
| Vault module | 20 |
| Vendors module | 19 |
| Automation module | 10 |
| Custom Fields module | 8 |
| Directory Sync | 2 |
| **Total (approximate)** | **~250+** |

---

*Generated from code review of `itd-opms-api/` at commit `e5fbd10` on branch `dev`.*

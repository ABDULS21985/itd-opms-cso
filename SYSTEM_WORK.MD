# 10 AI Agent Prompts for System Administration Module — End-to-End Implementation

Based on deep study of the **ITD-AMD-OPMS Requirements Specification V2** (280+ requirements, 7 domains, 100 capabilities) and the **Solution Architecture v2** (TOGAF 10-aligned), plus analysis of the existing codebase (15 migrations, ~350 sqlc queries, 7 domain modules, ~200+ API endpoints), these 10 prompts implement the **System Administration module** (`/dashboard/system`) end-to-end.

The System module is the **cross-cutting administration backbone** that surfaces user management, role/permission administration, tenant/org-unit governance, audit log exploration, system configuration, session management, and platform health — all features that exist as infrastructure but have **NO frontend pages or dedicated backend module** yet.

---

## PROMPT 1: System Module Backend Foundation — User & Role Management Service

You are a senior Go engineer continuing development of ITD-OPMS (Operations & Performance Management System) for the Central Bank of Nigeria's IT Department. The platform is a TOGAF 10-aligned, audit-ready, multi-tenant enterprise system built as a Go modular monolith.

### EXISTING CODEBASE CONTEXT
- **Backend**: `itd-opms-api/` — Go modular monolith (module: `github.com/itd-cbn/itd-opms-api`)
- **Router**: chi/v5, **DB**: pgx/v5 + sqlc, **Migrations**: goose/v3
- **Auth**: Dual-mode — Entra ID OIDC (httpOnly cookies) + dev JWT (localStorage)
- **Existing tables**: `users`, `roles`, `role_bindings`, `delegations`, `refresh_tokens` (migration 002)
- **Existing tables**: `tenants`, `org_units`, `org_hierarchy` (migration 001)
- **Existing tables**: `audit_events` (migration 003, append-only with SHA-256 checksums)
- **Existing auth queries**: `queries/auth.sql` (~20 lines), `queries/users.sql` (~60 lines)
- **Existing platform services**: `internal/platform/auth/`, `internal/platform/audit/`, `internal/platform/middleware/rbac.go`
- **Response envelope**: `{status, data, meta, errors}` via `internal/shared/types/response.go`
- **Middleware chain**: recovery → correlation → logging → RealIP → CORS → SecurityHeaders → CSRF → Metrics → RateLimit → auth → tenant
- **Dev user**: admin@itd.cbn.gov.ng / admin123, role: global_admin
- **7 system roles** already seeded: global_admin, itd_director, head_of_division, supervisor, staff, auditor, service_desk_agent

### YOUR TASK — Create System Module: User & Role Management Backend

#### 1. Create `internal/modules/system/` module structure

Create these files:
```
internal/modules/system/
├── types.go           # All System module request/response types
├── handler.go         # Top-level handler composing sub-handlers
├── user_service.go    # User CRUD + search + bulk operations
├── user_handler.go    # User HTTP endpoints
├── role_service.go    # Role CRUD + permission management
├── role_handler.go    # Role HTTP endpoints
```

#### 2. `types.go` — System Module Types

Define request/response structs for:

**User Management:**
```go
// ListUsersParams — query params for user listing
type ListUsersParams struct {
    Page       int    `json:"page"`
    PageSize   int    `json:"pageSize"`
    Search     string `json:"search"`     // search by name, email
    RoleFilter string `json:"role"`       // filter by role name
    Status     string `json:"status"`     // active, inactive, all
    Department string `json:"department"` // filter by department
    SortBy     string `json:"sortBy"`     // name, email, lastLoginAt, createdAt
    SortOrder  string `json:"sortOrder"`  // asc, desc
}

// UserDetail — full user profile for admin view
type UserDetail struct {
    ID            uuid.UUID       `json:"id"`
    EntraID       string          `json:"entraId"`
    Email         string          `json:"email"`
    DisplayName   string          `json:"displayName"`
    JobTitle      string          `json:"jobTitle"`
    Department    string          `json:"department"`
    Office        string          `json:"office"`
    Unit          string          `json:"unit"`
    TenantID      uuid.UUID       `json:"tenantId"`
    TenantName    string          `json:"tenantName"`
    PhotoURL      string          `json:"photoUrl"`
    Phone         string          `json:"phone"`
    IsActive      bool            `json:"isActive"`
    LastLoginAt   *time.Time      `json:"lastLoginAt"`
    Metadata      json.RawMessage `json:"metadata"`
    CreatedAt     time.Time       `json:"createdAt"`
    UpdatedAt     time.Time       `json:"updatedAt"`
    Roles         []RoleBinding   `json:"roles"`
    Delegations   []Delegation    `json:"delegations"`
}

// UpdateUserRequest — admin update (not self-update)
type UpdateUserRequest struct {
    DisplayName *string `json:"displayName"`
    JobTitle    *string `json:"jobTitle"`
    Department  *string `json:"department"`
    Office      *string `json:"office"`
    Unit        *string `json:"unit"`
    Phone       *string `json:"phone"`
    IsActive    *bool   `json:"isActive"`
}

// AssignRoleRequest
type AssignRoleRequest struct {
    RoleID    uuid.UUID  `json:"roleId" validate:"required"`
    ScopeType string    `json:"scopeType"` // global, tenant, unit
    ScopeID   *uuid.UUID `json:"scopeId"`
    ExpiresAt *time.Time `json:"expiresAt"`
}

// CreateDelegationRequest
type CreateDelegationRequest struct {
    DelegateID uuid.UUID  `json:"delegateId" validate:"required"`
    RoleID     uuid.UUID  `json:"roleId" validate:"required"`
    Reason     string     `json:"reason" validate:"required"`
    StartsAt   time.Time  `json:"startsAt" validate:"required"`
    EndsAt     time.Time  `json:"endsAt" validate:"required"`
}
```

**Role Management:**
```go
// RoleDetail — full role view for admin
type RoleDetail struct {
    ID          uuid.UUID       `json:"id"`
    Name        string          `json:"name"`
    Description string          `json:"description"`
    Permissions json.RawMessage `json:"permissions"`
    IsSystem    bool            `json:"isSystem"`
    CreatedAt   time.Time       `json:"createdAt"`
    UserCount   int             `json:"userCount"` // number of users with this role
}

// CreateRoleRequest — for custom roles
type CreateRoleRequest struct {
    Name        string   `json:"name" validate:"required,min=3,max=50"`
    Description string   `json:"description"`
    Permissions []string `json:"permissions" validate:"required,min=1"`
}

// UpdateRoleRequest
type UpdateRoleRequest struct {
    Description *string  `json:"description"`
    Permissions []string `json:"permissions"`
}

// RoleBinding represents a user-role assignment
type RoleBinding struct {
    ID        uuid.UUID  `json:"id"`
    UserID    uuid.UUID  `json:"userId"`
    RoleID    uuid.UUID  `json:"roleId"`
    RoleName  string     `json:"roleName"`
    TenantID  uuid.UUID  `json:"tenantId"`
    ScopeType string     `json:"scopeType"`
    ScopeID   *uuid.UUID `json:"scopeId"`
    GrantedBy uuid.UUID  `json:"grantedBy"`
    GrantedAt time.Time  `json:"grantedAt"`
    ExpiresAt *time.Time `json:"expiresAt"`
    IsActive  bool       `json:"isActive"`
}

// Delegation represents a time-bound role delegation
type Delegation struct {
    ID           uuid.UUID  `json:"id"`
    DelegatorID  uuid.UUID  `json:"delegatorId"`
    DelegatorName string    `json:"delegatorName"`
    DelegateID   uuid.UUID  `json:"delegateId"`
    DelegateName string     `json:"delegateName"`
    RoleID       uuid.UUID  `json:"roleId"`
    RoleName     string     `json:"roleName"`
    TenantID     uuid.UUID  `json:"tenantId"`
    Reason       string     `json:"reason"`
    ApprovedBy   *uuid.UUID `json:"approvedBy"`
    StartsAt     time.Time  `json:"startsAt"`
    EndsAt       time.Time  `json:"endsAt"`
    IsActive     bool       `json:"isActive"`
    CreatedAt    time.Time  `json:"createdAt"`
}

// PermissionCatalog — all available permissions grouped by module
type PermissionCatalog struct {
    Module      string   `json:"module"`
    Permissions []string `json:"permissions"`
}
```

#### 3. `queries/system.sql` — sqlc Queries

Write comprehensive SQL queries for:

**User queries:**
- `ListUsers` — Paginated with search (ILIKE on display_name, email), filters (role, status, department), sorting, tenant-scoped
- `GetUserByID` — Full user detail with tenant name JOIN
- `UpdateUser` — Update mutable user fields
- `DeactivateUser` — Set is_active=false, revoke all active role_bindings
- `ReactivateUser` — Set is_active=true
- `GetUserRoleBindings` — All active role bindings for a user with role name JOIN
- `AssignRoleToUser` — Insert into role_bindings
- `RevokeRoleFromUser` — Set role_binding.is_active=false
- `GetUserDelegations` — Active delegations (both as delegator and delegate)
- `CreateDelegation` — Insert delegation with validation (no self-delegation, date range valid)
- `RevokeDelegation` — Set delegation.is_active=false
- `CountUsersByRole` — Count users per role for role detail view
- `CountActiveUsers` — Total active users (for dashboard stat)
- `SearchUsers` — Quick search for user picker (autocomplete) — returns id, displayName, email

**Role queries:**
- `ListRoles` — All roles with user count
- `GetRoleByID` — Role detail with user count
- `CreateRole` — Insert custom role (is_system=false)
- `UpdateRole` — Update description and permissions (only non-system roles)
- `DeleteRole` — Delete custom role (only if no active bindings, and is_system=false)
- `GetPermissionCatalog` — Return all distinct permissions from all roles (for permission picker UI)

#### 4. Services & Handlers

**UserService** (`user_service.go`):
- `ListUsers(ctx, tenantID, params)` — with pagination, search, filters
- `GetUser(ctx, tenantID, userID)` — returns UserDetail with roles and delegations
- `UpdateUser(ctx, tenantID, userID, req)` — validates, updates, logs audit event
- `DeactivateUser(ctx, tenantID, userID)` — deactivates user + revokes all roles, logs audit
- `ReactivateUser(ctx, tenantID, userID)` — reactivates, logs audit
- `AssignRole(ctx, tenantID, userID, req)` — assigns role, validates scope, logs audit
- `RevokeRole(ctx, tenantID, userID, bindingID)` — revokes, logs audit
- `CreateDelegation(ctx, tenantID, delegatorID, req)` — creates delegation, logs audit
- `RevokeDelegation(ctx, tenantID, delegationID)` — revokes, logs audit
- `SearchUsers(ctx, tenantID, query)` — quick search for autocomplete

**UserHandler** (`user_handler.go`):
```
GET    /api/v1/system/users          — List users (paginated, searchable, filterable)
GET    /api/v1/system/users/:id      — Get user detail
PATCH  /api/v1/system/users/:id      — Update user
POST   /api/v1/system/users/:id/deactivate   — Deactivate user
POST   /api/v1/system/users/:id/reactivate   — Reactivate user
POST   /api/v1/system/users/:id/roles        — Assign role
DELETE /api/v1/system/users/:id/roles/:bindingId  — Revoke role
GET    /api/v1/system/users/:id/delegations  — List delegations
POST   /api/v1/system/users/:id/delegations  — Create delegation
DELETE /api/v1/system/users/:id/delegations/:delegationId — Revoke delegation
GET    /api/v1/system/users/search   — Quick user search (autocomplete)
```

**RoleService** (`role_service.go`):
- `ListRoles(ctx, tenantID)` — all roles with user counts
- `GetRole(ctx, tenantID, roleID)` — role detail
- `CreateRole(ctx, tenantID, req)` — create custom role, logs audit
- `UpdateRole(ctx, tenantID, roleID, req)` — update (non-system only), logs audit
- `DeleteRole(ctx, tenantID, roleID)` — delete custom role, logs audit
- `GetPermissionCatalog(ctx)` — all available permissions grouped by module

**RoleHandler** (`role_handler.go`):
```
GET    /api/v1/system/roles           — List all roles
GET    /api/v1/system/roles/:id       — Get role detail
POST   /api/v1/system/roles           — Create custom role
PATCH  /api/v1/system/roles/:id       — Update role
DELETE /api/v1/system/roles/:id       — Delete custom role
GET    /api/v1/system/permissions     — Permission catalog
```

#### 5. Wire into Server

Update `internal/platform/server/server.go` to mount the system module:
```go
r.Route("/system", func(r chi.Router) {
    r.Use(middleware.RequirePermission("system.view"))
    systemHandler.Routes(r)
})
```

**Handler composition** (`handler.go`):
```go
type Handler struct {
    user *UserHandler
    role *RoleHandler
}

func NewHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Handler { ... }

func (h *Handler) Routes(r chi.Router) {
    r.Route("/users", func(r chi.Router) { h.user.Routes(r) })
    r.Route("/roles", func(r chi.Router) { h.role.Routes(r) })
    r.Get("/permissions", h.role.GetPermissionCatalog)
}
```

### REQUIREMENTS TRACEABILITY
- **SR-004**: RBAC with 6+ defined roles → Role management CRUD
- **SR-005**: ABAC scope boundaries → Scope-aware role bindings
- **SR-007**: Time-bound delegations → Delegation CRUD with date validation
- **SR-008**: Log all authorization decisions → Audit events on role/delegation changes
- **BR-014**: Delegation of authority → Delegation management endpoints
- **NFR-024**: Configuration without code deployment → Custom role CRUD

### VERIFICATION
1. `go build ./...` compiles without errors
2. `GET /api/v1/system/users` returns paginated user list
3. `POST /api/v1/system/users/:id/roles` assigns a role and creates audit event
4. `POST /api/v1/system/users/:id/delegations` creates time-bound delegation
5. Custom role CRUD works (create, update, delete) — system roles are immutable
6. Permission catalog returns all permissions grouped by module

---

## PROMPT 2: Tenant & Organisation Management Backend

You are continuing the System Administration module for ITD-OPMS. Prompt 1 created user and role management. Now implement tenant and org-unit management.

### EXISTING CONTEXT (from Prompt 1)
- System module exists at `internal/modules/system/`
- User & Role handlers wired at `/api/v1/system/users` and `/api/v1/system/roles`
- `types.go` has User/Role types, `handler.go` composes sub-handlers
- Tables exist: `tenants`, `org_units`, `org_hierarchy` (migration 001)

### YOUR TASK — Tenant & Org Unit Management

#### 1. Add to `types.go`

```go
// TenantDetail — full tenant view
type TenantDetail struct {
    ID        uuid.UUID       `json:"id"`
    Name      string          `json:"name"`
    Code      string          `json:"code"`
    Type      string          `json:"type"` // division, office
    ParentID  *uuid.UUID      `json:"parentId"`
    ParentName string         `json:"parentName"`
    IsActive  bool            `json:"isActive"`
    Config    json.RawMessage `json:"config"`
    CreatedAt time.Time       `json:"createdAt"`
    UpdatedAt time.Time       `json:"updatedAt"`
    UserCount int             `json:"userCount"`
    Children  []TenantSummary `json:"children"`
}

type TenantSummary struct {
    ID       uuid.UUID `json:"id"`
    Name     string    `json:"name"`
    Code     string    `json:"code"`
    Type     string    `json:"type"`
    IsActive bool      `json:"isActive"`
    UserCount int      `json:"userCount"`
}

type CreateTenantRequest struct {
    Name     string          `json:"name" validate:"required,min=2,max=100"`
    Code     string          `json:"code" validate:"required,min=2,max=20"`
    Type     string          `json:"type" validate:"required,oneof=division office"`
    ParentID *uuid.UUID      `json:"parentId"`
    Config   json.RawMessage `json:"config"`
}

type UpdateTenantRequest struct {
    Name     *string          `json:"name"`
    Config   *json.RawMessage `json:"config"`
    IsActive *bool            `json:"isActive"`
}

// OrgUnitDetail — for org hierarchy management
type OrgUnitDetail struct {
    ID             uuid.UUID  `json:"id"`
    TenantID       uuid.UUID  `json:"tenantId"`
    Name           string     `json:"name"`
    Code           string     `json:"code"`
    Level          string     `json:"level"` // department, division, office, unit
    ParentID       *uuid.UUID `json:"parentId"`
    ParentName     string     `json:"parentName"`
    ManagerUserID  *uuid.UUID `json:"managerUserId"`
    ManagerName    string     `json:"managerName"`
    IsActive       bool       `json:"isActive"`
    Metadata       json.RawMessage `json:"metadata"`
    CreatedAt      time.Time  `json:"createdAt"`
    UpdatedAt      time.Time  `json:"updatedAt"`
    ChildCount     int        `json:"childCount"`
    UserCount      int        `json:"userCount"`
}

type OrgTreeNode struct {
    ID        uuid.UUID     `json:"id"`
    Name      string        `json:"name"`
    Code      string        `json:"code"`
    Level     string        `json:"level"`
    ManagerName string      `json:"managerName"`
    UserCount int           `json:"userCount"`
    Children  []OrgTreeNode `json:"children"`
}

type CreateOrgUnitRequest struct {
    Name          string     `json:"name" validate:"required"`
    Code          string     `json:"code" validate:"required"`
    Level         string     `json:"level" validate:"required,oneof=department division office unit"`
    ParentID      *uuid.UUID `json:"parentId"`
    ManagerUserID *uuid.UUID `json:"managerUserId"`
}

type UpdateOrgUnitRequest struct {
    Name          *string    `json:"name"`
    ManagerUserID *uuid.UUID `json:"managerUserId"`
    IsActive      *bool      `json:"isActive"`
}
```

#### 2. Add queries to `queries/system.sql`

**Tenant queries:**
- `ListTenants` — All tenants with user count and parent name
- `GetTenantByID` — Tenant detail with user count
- `GetTenantChildren` — Direct children of a tenant
- `CreateTenant` — Insert tenant
- `UpdateTenant` — Update name, config, active status
- `DeactivateTenant` — Set is_active=false (cascade deactivate child tenants)
- `GetTenantHierarchy` — Full tenant tree using org_hierarchy closure table

**Org Unit queries:**
- `ListOrgUnits` — Paginated org units for a tenant
- `GetOrgUnitByID` — Org unit with parent name, manager name, child/user counts
- `GetOrgTree` — Full org tree using recursive CTE (for org chart visualization)
- `CreateOrgUnit` — Insert org unit + update org_hierarchy closure table
- `UpdateOrgUnit` — Update name, manager, active status
- `MoveOrgUnit` — Change parent (update org_hierarchy closure table)
- `DeleteOrgUnit` — Soft delete (only if no children and no assigned users)
- `GetOrgUnitUsers` — Users in a specific org unit

#### 3. Create Services & Handlers

**TenantService** (`tenant_service.go`):
- `ListTenants(ctx)` — all tenants (global_admin only)
- `GetTenant(ctx, tenantID)` — tenant detail with children
- `CreateTenant(ctx, req)` — create, validate unique code, log audit
- `UpdateTenant(ctx, tenantID, req)` — update, log audit
- `DeactivateTenant(ctx, tenantID)` — deactivate with cascade warning, log audit
- `GetTenantHierarchy(ctx)` — full tenant tree

**TenantHandler** (`tenant_handler.go`):
```
GET    /api/v1/system/tenants           — List tenants
GET    /api/v1/system/tenants/tree      — Tenant hierarchy tree
GET    /api/v1/system/tenants/:id       — Get tenant detail
POST   /api/v1/system/tenants           — Create tenant
PATCH  /api/v1/system/tenants/:id       — Update tenant
POST   /api/v1/system/tenants/:id/deactivate — Deactivate tenant
```

**OrgService** (`org_service.go`):
- `ListOrgUnits(ctx, tenantID, params)` — paginated
- `GetOrgUnit(ctx, tenantID, orgUnitID)` — detail
- `GetOrgTree(ctx, tenantID)` — full tree for org chart
- `CreateOrgUnit(ctx, tenantID, req)` — create, update closure table, log audit
- `UpdateOrgUnit(ctx, tenantID, orgUnitID, req)` — update, log audit
- `MoveOrgUnit(ctx, tenantID, orgUnitID, newParentID)` — move in hierarchy, update closure table
- `DeleteOrgUnit(ctx, tenantID, orgUnitID)` — soft delete with validation

**OrgHandler** (`org_handler.go`):
```
GET    /api/v1/system/org-units            — List org units
GET    /api/v1/system/org-units/tree       — Org hierarchy tree
GET    /api/v1/system/org-units/:id        — Get org unit detail
POST   /api/v1/system/org-units            — Create org unit
PATCH  /api/v1/system/org-units/:id        — Update org unit
POST   /api/v1/system/org-units/:id/move   — Move org unit in hierarchy
DELETE /api/v1/system/org-units/:id        — Delete org unit
GET    /api/v1/system/org-units/:id/users  — Users in org unit
```

#### 4. Wire into handler.go

Add `tenant` and `org` sub-handlers to the system Handler struct and Routes method.

### REQUIREMENTS TRACEABILITY
- **BR-007**: Progressive rollout with minimal re-architecture → Tenant CRUD for onboarding new divisions
- **AP-06**: Tenant Isolation → Tenant management with hierarchy
- **FR-A020**: Organisational structure visualisation → Org tree endpoint
- **DRA-001**: tenant_id on all scoped tables → Tenant management

### VERIFICATION
1. `go build ./...` compiles
2. `GET /api/v1/system/tenants/tree` returns tenant hierarchy
3. `GET /api/v1/system/org-units/tree` returns org chart data
4. Create tenant → create org unit → assign manager → verify tree updates

---

## PROMPT 3: System Settings, Audit Log Explorer & Session Management Backend

You are continuing the System Administration module. Prompts 1-2 created user, role, tenant, and org management. Now implement system settings, enhanced audit log explorer, and session management.

### EXISTING CONTEXT
- System module at `internal/modules/system/` with user, role, tenant, org handlers
- `audit_events` table exists (append-only, SHA-256 checksums) with basic query/verify endpoints at `/api/v1/audit/`
- `refresh_tokens` table tracks active sessions
- Platform config via Viper at `internal/platform/config/config.go`

### YOUR TASK

#### 1. Migration 016: System Settings & Sessions

Create `migrations/016_system_settings_and_sessions.sql`:

```sql
-- System settings (key-value with JSONB, tenant-scoped or global)
CREATE TABLE system_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),  -- NULL = global setting
    category    TEXT NOT NULL,       -- 'general', 'security', 'notifications', 'branding', 'integrations'
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    description TEXT,
    is_secret   BOOLEAN DEFAULT false,  -- mask value in API responses
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);

-- Active sessions for session management
CREATE TABLE active_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    token_hash   TEXT NOT NULL UNIQUE,
    ip_address   INET,
    user_agent   TEXT,
    device_info  JSONB,       -- parsed UA: browser, os, device
    location     TEXT,         -- derived from IP if available
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    last_active  TIMESTAMPTZ DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    is_revoked   BOOLEAN DEFAULT false,
    revoked_at   TIMESTAMPTZ,
    revoked_by   UUID REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON active_sessions(user_id) WHERE NOT is_revoked;
CREATE INDEX idx_sessions_active ON active_sessions(last_active) WHERE NOT is_revoked;

-- Email templates (customizable notification templates)
CREATE TABLE email_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),  -- NULL = global template
    name        TEXT NOT NULL,
    subject     TEXT NOT NULL,
    body_html   TEXT NOT NULL,
    body_text   TEXT,
    variables   JSONB,        -- list of template variables with descriptions
    category    TEXT NOT NULL, -- 'itsm', 'governance', 'grc', 'system', etc.
    is_active   BOOLEAN DEFAULT true,
    updated_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Seed default system settings
INSERT INTO system_settings (tenant_id, category, key, value, description) VALUES
(NULL, 'general', 'platform_name', '"ITD-OPMS"', 'Platform display name'),
(NULL, 'general', 'platform_tagline', '"Operations & Performance Management System"', 'Platform tagline'),
(NULL, 'general', 'default_timezone', '"Africa/Lagos"', 'Default timezone (WAT)'),
(NULL, 'general', 'date_format', '"DD/MM/YYYY"', 'Default date display format'),
(NULL, 'general', 'items_per_page', '25', 'Default pagination size'),
(NULL, 'security', 'session_timeout_minutes', '30', 'Session inactivity timeout'),
(NULL, 'security', 'max_sessions_per_user', '5', 'Maximum concurrent sessions'),
(NULL, 'security', 'password_min_length', '12', 'Minimum password length (dev mode only)'),
(NULL, 'security', 'enforce_mfa', 'true', 'Require MFA via Entra ID'),
(NULL, 'security', 'allowed_ip_ranges', '[]', 'Allowed IP CIDR ranges (empty = all)'),
(NULL, 'security', 'rate_limit_per_minute', '100', 'API rate limit per user per minute'),
(NULL, 'notifications', 'email_enabled', 'true', 'Enable email notifications'),
(NULL, 'notifications', 'teams_enabled', 'true', 'Enable Teams notifications'),
(NULL, 'notifications', 'quiet_hours_start', '"22:00"', 'Quiet hours start (WAT)'),
(NULL, 'notifications', 'quiet_hours_end', '"07:00"', 'Quiet hours end (WAT)'),
(NULL, 'notifications', 'digest_frequency', '"daily"', 'Notification digest frequency'),
(NULL, 'branding', 'primary_color', '"#1B7340"', 'CBN brand primary color'),
(NULL, 'branding', 'logo_url', '""', 'Custom logo URL'),
(NULL, 'branding', 'favicon_url', '""', 'Custom favicon URL'),
(NULL, 'integrations', 'entra_id_enabled', 'true', 'Entra ID SSO enabled'),
(NULL, 'integrations', 'graph_sync_interval', '"30m"', 'Directory sync interval'),
(NULL, 'integrations', 'graph_sync_enabled', 'true', 'Directory sync enabled');
```

#### 2. Add queries to `queries/system.sql`

**System Settings queries:**
- `ListSettings` — All settings for a category (with tenant override resolution: tenant-specific > global)
- `GetSetting` — Single setting by category+key with tenant override
- `UpsertSetting` — Insert or update a setting value
- `DeleteTenantSetting` — Remove tenant override (fall back to global)
- `ListSettingCategories` — Distinct categories

**Audit Log Explorer queries (enhanced beyond existing):**
- `ListAuditEventsAdvanced` — Paginated with filters: dateRange (start/end), actorId, entityType, entityId, action, search (ILIKE on changes JSON), tenantId, sortBy, sortOrder
- `GetAuditEventDetail` — Single event with actor display name JOIN
- `GetAuditEventTimeline` — Events for a specific entity (entity_type + entity_id), ordered by timestamp — for entity audit trail view
- `GetAuditStats` — Aggregated stats: events per day (last 30 days), top actors, top entity types, top actions — for audit dashboard
- `ExportAuditEvents` — Same as ListAuditEventsAdvanced but no pagination (for CSV/JSON export, limited to 10,000 rows)
- `VerifyAuditIntegrity` — Verify SHA-256 checksum chain for a date range

**Session queries:**
- `ListActiveSessions` — All active (non-revoked, non-expired) sessions for a user or all users
- `GetSessionByID` — Session detail
- `CreateSession` — Insert new session
- `UpdateSessionActivity` — Update last_active timestamp
- `RevokeSession` — Set is_revoked=true with revoked_by and timestamp
- `RevokeAllUserSessions` — Revoke all sessions for a user (force logout)
- `CleanExpiredSessions` — Delete expired sessions older than 30 days
- `GetSessionStats` — Active session count, unique users online, sessions by device type

**Email Template queries:**
- `ListEmailTemplates` — Paginated with category filter
- `GetEmailTemplateByID` — Template detail
- `GetEmailTemplateByName` — Lookup by name for rendering
- `CreateEmailTemplate` — Insert template
- `UpdateEmailTemplate` — Update template
- `DeleteEmailTemplate` — Delete custom template

#### 3. Create Services & Handlers

**SettingsService** (`settings_service.go`):
- `ListSettings(ctx, tenantID, category)` — resolve tenant overrides
- `GetSetting(ctx, tenantID, category, key)` — with fallback to global
- `UpdateSetting(ctx, tenantID, category, key, value, actorID)` — upsert + audit
- `ResetSetting(ctx, tenantID, category, key)` — remove tenant override
- `GetAllCategories(ctx)` — list categories

**SettingsHandler** (`settings_handler.go`):
```
GET    /api/v1/system/settings                     — List settings by category
GET    /api/v1/system/settings/:category/:key      — Get single setting
PUT    /api/v1/system/settings/:category/:key      — Update setting
DELETE /api/v1/system/settings/:category/:key      — Reset to global default
GET    /api/v1/system/settings/categories           — List categories
```

**AuditExplorerService** (`audit_explorer_service.go`):
- `ListEvents(ctx, params)` — advanced filtering
- `GetEvent(ctx, eventID)` — detail with actor name
- `GetEntityTimeline(ctx, entityType, entityID)` — entity audit trail
- `GetStats(ctx, tenantID, dateRange)` — audit dashboard stats
- `ExportEvents(ctx, params, format)` — export as CSV or JSON
- `VerifyIntegrity(ctx, dateRange)` — checksum verification

**AuditExplorerHandler** (`audit_explorer_handler.go`):
```
GET    /api/v1/system/audit-logs                   — List audit events (advanced filters)
GET    /api/v1/system/audit-logs/:id               — Get event detail
GET    /api/v1/system/audit-logs/entity/:type/:id  — Entity audit timeline
GET    /api/v1/system/audit-logs/stats             — Audit statistics
GET    /api/v1/system/audit-logs/export            — Export events (CSV/JSON)
POST   /api/v1/system/audit-logs/verify            — Verify integrity
```

**SessionService** (`session_service.go`):
- `ListSessions(ctx, params)` — all or per-user active sessions
- `GetSessionStats(ctx)` — dashboard stats
- `RevokeSession(ctx, sessionID, revokedBy)` — revoke single session
- `RevokeUserSessions(ctx, userID, revokedBy)` — force logout user
- `CleanExpiredSessions(ctx)` — background cleanup

**SessionHandler** (`session_handler.go`):
```
GET    /api/v1/system/sessions                     — List active sessions
GET    /api/v1/system/sessions/stats               — Session statistics
DELETE /api/v1/system/sessions/:id                 — Revoke session
DELETE /api/v1/system/sessions/user/:userId        — Force logout user
```

**EmailTemplateService** (`template_service.go`):
- CRUD for email templates with audit logging

**EmailTemplateHandler** (`template_handler.go`):
```
GET    /api/v1/system/email-templates              — List templates
GET    /api/v1/system/email-templates/:id          — Get template
POST   /api/v1/system/email-templates              — Create template
PATCH  /api/v1/system/email-templates/:id          — Update template
DELETE /api/v1/system/email-templates/:id          — Delete template
POST   /api/v1/system/email-templates/:id/preview  — Preview rendered template
```

#### 4. Wire all new sub-handlers into system Handler

### REQUIREMENTS TRACEABILITY
- **NFR-024**: Configuration without code deployment → System settings CRUD
- **SR-002**: 30-minute session timeout → Session management
- **SR-003**: Session revocation on security events → Force logout
- **SR-016–SR-020**: Immutable audit events → Enhanced audit explorer
- **SR-020**: Audit export CSV/JSON → Export endpoint
- **SR-019**: 7-year retention → Audit integrity verification

### VERIFICATION
1. `make migrate-up` applies migration 016
2. `GET /api/v1/system/settings?category=security` returns settings with defaults
3. `PUT /api/v1/system/settings/security/session_timeout_minutes` updates and creates audit event
4. `GET /api/v1/system/audit-logs?entityType=ticket&dateFrom=...&dateTo=...` filters correctly
5. `GET /api/v1/system/audit-logs/stats` returns aggregated audit statistics
6. Session list shows active sessions, revoke terminates session

---

## PROMPT 4: Platform Health, Metrics Dashboard & Directory Sync Status Backend

You are continuing the System Administration module. Prompts 1-3 created user/role/tenant/org management, settings, audit explorer, and sessions. Now implement platform health monitoring, directory sync status, and system statistics.

### YOUR TASK

#### 1. Add to `types.go`

```go
// PlatformHealth — comprehensive health check
type PlatformHealth struct {
    Status     string            `json:"status"` // healthy, degraded, unhealthy
    Uptime     string            `json:"uptime"`
    Version    string            `json:"version"`
    GoVersion  string            `json:"goVersion"`
    Services   []ServiceHealth   `json:"services"`
    Timestamp  time.Time         `json:"timestamp"`
}

type ServiceHealth struct {
    Name      string `json:"name"`     // postgres, redis, minio, nats
    Status    string `json:"status"`   // up, down, degraded
    Latency   string `json:"latency"`  // "2ms"
    Details   string `json:"details"`  // version, connection count, etc.
}

// SystemStats — cross-module statistics for system dashboard
type SystemStats struct {
    Users        UserStats       `json:"users"`
    Sessions     SessionStats    `json:"sessions"`
    AuditEvents  AuditStats      `json:"auditEvents"`
    Storage      StorageStats    `json:"storage"`
    Database     DatabaseStats   `json:"database"`
    Modules      []ModuleStats   `json:"modules"`
}

type UserStats struct {
    TotalUsers     int `json:"totalUsers"`
    ActiveUsers    int `json:"activeUsers"`
    InactiveUsers  int `json:"inactiveUsers"`
    OnlineNow      int `json:"onlineNow"`
    NewThisMonth   int `json:"newThisMonth"`
}

type SessionStats struct {
    ActiveSessions int `json:"activeSessions"`
    UniqueUsers    int `json:"uniqueUsers"`
    ByDevice       map[string]int `json:"byDevice"` // desktop, mobile, tablet
}

type AuditStats struct {
    TotalEvents     int64  `json:"totalEvents"`
    EventsToday     int    `json:"eventsToday"`
    EventsThisWeek  int    `json:"eventsThisWeek"`
    IntegrityStatus string `json:"integrityStatus"` // verified, unverified, failed
    LastVerified    *time.Time `json:"lastVerified"`
}

type StorageStats struct {
    TotalObjects    int64  `json:"totalObjects"`
    TotalSize       string `json:"totalSize"`      // human-readable
    EvidenceItems   int    `json:"evidenceItems"`
    Attachments     int    `json:"attachments"`
}

type DatabaseStats struct {
    Size              string `json:"size"`             // database size
    TableCount        int    `json:"tableCount"`
    ActiveConnections int    `json:"activeConnections"`
    MaxConnections    int    `json:"maxConnections"`
}

type ModuleStats struct {
    Name          string `json:"name"`
    RecordCount   int64  `json:"recordCount"`
    ActiveItems   int    `json:"activeItems"`
    LastActivity  *time.Time `json:"lastActivity"`
}

// DirectorySyncStatus — Entra ID directory sync info
type DirectorySyncStatus struct {
    Enabled       bool       `json:"enabled"`
    LastSync      *time.Time `json:"lastSync"`
    LastSyncStatus string    `json:"lastSyncStatus"` // success, failed, partial
    NextScheduled *time.Time `json:"nextScheduled"`
    UsersAdded    int        `json:"usersAdded"`
    UsersUpdated  int        `json:"usersUpdated"`
    UsersRemoved  int        `json:"usersRemoved"`
    SyncHistory   []SyncRun  `json:"syncHistory"`
}

type SyncRun struct {
    ID           uuid.UUID `json:"id"`
    Status       string    `json:"status"`
    StartedAt    time.Time `json:"startedAt"`
    CompletedAt  *time.Time `json:"completedAt"`
    UsersAdded   int       `json:"usersAdded"`
    UsersUpdated int       `json:"usersUpdated"`
    UsersRemoved int       `json:"usersRemoved"`
    Errors       int       `json:"errors"`
    ErrorDetails string    `json:"errorDetails"`
}
```

#### 2. Add queries to `queries/system.sql`

**Platform Stats queries:**
- `GetUserStats` — Count total, active, inactive, new this month
- `GetOnlineUserCount` — Count distinct users with active sessions in last 15 minutes
- `GetDatabaseSize` — `SELECT pg_size_pretty(pg_database_size(current_database()))`
- `GetTableCount` — Count tables in public schema
- `GetConnectionStats` — Active and max connections from pg_stat_activity
- `GetModuleStats` — Record counts for each major entity table (tickets, assets, projects, policies, risks, articles)
- `GetLastModuleActivity` — Most recent updated_at per module

**Directory Sync queries (extend existing):**
- `ListDirectorySyncRuns` — Paginated sync history from directory_sync_runs table
- `GetLatestSyncRun` — Most recent sync with details

#### 3. Create Services & Handlers

**HealthService** (`health_service.go`):
- `GetPlatformHealth(ctx)` — Check all services (postgres, redis, minio, nats) with latency measurement
- `GetSystemStats(ctx)` — Aggregate cross-module statistics
- `GetDirectorySyncStatus(ctx)` — Current sync status and history

**HealthHandler** (`health_handler.go`):
```
GET    /api/v1/system/health           — Detailed platform health (admin-level, includes service details)
GET    /api/v1/system/stats            — System-wide statistics
GET    /api/v1/system/directory-sync   — Directory sync status
POST   /api/v1/system/directory-sync/trigger — Trigger manual sync
```

Note: The existing `/api/v1/health` is the public health endpoint. The new `/api/v1/system/health` is the admin-level detailed health check with service-level details.

#### 4. Background cleanup goroutine

Add a `SystemMaintenance` background worker that runs on a timer:
- Clean expired sessions every hour
- Update online user counts every 5 minutes
- Verify audit integrity weekly

### REQUIREMENTS TRACEABILITY
- **NFR-009**: 99.5% availability → Health monitoring
- **NFR-022–NFR-026**: Maintainability → System statistics, health checks
- **IR-006**: Org hierarchy sync → Directory sync status page
- **AP-05**: Operational Excellence → Platform health dashboard

### VERIFICATION
1. `GET /api/v1/system/health` returns status of all services with latencies
2. `GET /api/v1/system/stats` returns user counts, session stats, audit stats, storage info
3. `GET /api/v1/system/directory-sync` shows sync history
4. Background cleanup runs without errors

---

## PROMPT 5: System Administration Frontend — Layout, Users & Roles Pages

You are a senior frontend engineer continuing ITD-OPMS portal development. The System module backend (Prompts 1-4) provides APIs at `/api/v1/system/`. Now build the frontend pages.

### EXISTING FRONTEND CONTEXT
- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind 4 + CSS custom properties (CBN green/gold palette)
- **State**: TanStack Query 5 for server state
- **Components**: shadcn/ui + custom `DataTable`, `FormField`, `StatusBadge`, `ConfirmDialog`, `LoadingSkeleton`, `EmptyState`
- **Auth**: `useAuth()` hook from `providers/auth-provider.tsx`
- **API**: `apiClient` from `lib/api-client.ts` (handles auth headers, error transformation)
- **Types**: `types/index.ts` (User, Role, Tenant, AuditEvent, etc.)
- **Sidebar**: Already has `/dashboard/system/audit-logs` and `/dashboard/system/settings` links
- **Hook pattern**: Each module has a `hooks/use-{module}.ts` with TanStack Query hooks

### YOUR TASK — System Module Frontend: Layout + Users + Roles

#### 1. Extend Sidebar Navigation

Update `components/layout/sidebar.tsx` to expand the System section:
```typescript
{
  label: "System",
  items: [
    { href: "/dashboard/system", label: "Overview", icon: LayoutDashboard, permission: "system.view" },
    { href: "/dashboard/system/users", label: "Users", icon: Users, permission: "system.manage" },
    { href: "/dashboard/system/roles", label: "Roles & Permissions", icon: Shield, permission: "system.manage" },
    { href: "/dashboard/system/tenants", label: "Tenants", icon: Building2, permission: "system.manage" },
    { href: "/dashboard/system/org-units", label: "Org Structure", icon: Network, permission: "system.manage" },
    { href: "/dashboard/system/audit-logs", label: "Audit Logs", icon: ScrollText, permission: "system.view" },
    { href: "/dashboard/system/sessions", label: "Sessions", icon: MonitorSmartphone, permission: "system.manage" },
    { href: "/dashboard/system/settings", label: "Settings", icon: Settings, permission: "system.manage" },
    { href: "/dashboard/system/email-templates", label: "Email Templates", icon: Mail, permission: "system.manage" },
    { href: "/dashboard/system/health", label: "Platform Health", icon: Activity, permission: "system.view" },
  ],
}
```

#### 2. Add TypeScript Types

Extend `types/index.ts` with system module types:
- `UserDetail` (with roles, delegations arrays)
- `RoleDetail` (with permissions array, userCount)
- `RoleBinding`, `Delegation`
- `SystemSetting`, `SettingCategory`
- `ActiveSession`, `SessionStats`
- `PlatformHealth`, `ServiceHealth`
- `SystemStats` (users, sessions, audit, storage, database, modules)
- `DirectorySyncStatus`, `SyncRun`
- `EmailTemplate`
- `OrgTreeNode`, `OrgUnitDetail`
- `TenantDetail`, `TenantSummary`

#### 3. Create `hooks/use-system.ts`

Create TanStack Query hooks for all system endpoints:

**User hooks:**
- `useUsers(params)` — paginated user list
- `useUser(id)` — single user detail
- `useUpdateUser()` — mutation
- `useDeactivateUser()` — mutation
- `useReactivateUser()` — mutation
- `useAssignRole()` — mutation
- `useRevokeRole()` — mutation
- `useCreateDelegation()` — mutation
- `useRevokeDelegation()` — mutation
- `useSearchUsers(query)` — debounced search for autocomplete

**Role hooks:**
- `useRoles()` — all roles
- `useRole(id)` — single role
- `useCreateRole()` — mutation
- `useUpdateRole()` — mutation
- `useDeleteRole()` — mutation
- `usePermissionCatalog()` — all permissions grouped by module

#### 4. Create Pages

**`app/dashboard/system/layout.tsx`** — System module layout (no extra wrapping, just pass through children, maybe add breadcrumb context)

**`app/dashboard/system/page.tsx`** — System Overview Dashboard
- Grid of stat cards: Total Users, Active Sessions, Audit Events Today, Storage Used
- Quick links to sub-sections
- Recent audit events (last 5)
- Platform health summary (green/yellow/red indicators)

**`app/dashboard/system/users/page.tsx`** — User Management
- DataTable with columns: Avatar+Name, Email, Department, Roles (badges), Status (active/inactive badge), Last Login, Actions
- Search bar (searches name+email)
- Filters: Role dropdown, Status dropdown, Department dropdown
- Row click → opens user detail panel or navigate to user detail page
- Bulk actions: Deactivate selected

**`app/dashboard/system/users/[id]/page.tsx`** — User Detail Page
- User profile card (avatar, name, email, department, job title, last login)
- Tab layout:
  - **Roles** tab: List of role bindings with scope, granted by, expiry. Add Role button → sheet/dialog with role selector + scope selector + optional expiry date. Revoke button per binding.
  - **Delegations** tab: Active delegations (given and received). Create Delegation button → dialog with user search, role selector, date range, reason. Revoke button.
  - **Activity** tab: Recent audit events for this user (using entity timeline API)
  - **Sessions** tab: Active sessions for this user with device/IP/last active. Force logout button.
- Actions: Deactivate/Reactivate button, Edit profile button

**`app/dashboard/system/roles/page.tsx`** — Roles & Permissions Management
- Cards grid for each role showing: Name, description, user count badge, system badge
- System roles (7) shown with lock icon — can view but not edit/delete
- Custom roles can be created, edited, deleted
- Click role → opens role detail page

**`app/dashboard/system/roles/[id]/page.tsx`** — Role Detail Page
- Role info card (name, description, system/custom badge, user count)
- Permissions grid: grouped by module, checkboxes for each permission (view/create/update/delete/approve)
- For system roles: checkboxes are disabled (read-only view)
- For custom roles: checkboxes are editable
- Users with this role: list of users who have this role binding

### REQUIREMENTS TRACEABILITY
- **NFR-017**: Role-aware navigation → Sidebar with permission checks
- **SR-004**: 6+ roles configured → Roles management page
- **BR-014**: Delegation of authority → Delegation management in user detail

### VERIFICATION
1. `npm run dev` starts, navigate to `/dashboard/system` — overview loads
2. `/dashboard/system/users` — DataTable loads with user data, search works, filters work
3. `/dashboard/system/users/:id` — Tabs render (roles, delegations, activity, sessions)
4. Assign role → table updates, audit event logged
5. `/dashboard/system/roles` — All 7 system roles visible, custom role CRUD works
6. TypeScript compiles cleanly (`tsc --noEmit`)

---

## PROMPT 6: System Frontend — Tenants, Org Structure & Audit Log Explorer Pages

You are continuing the System frontend. Prompt 5 created users/roles pages. Now build tenants, org structure, and the audit log explorer.

### YOUR TASK

#### 1. Add to `hooks/use-system.ts`

**Tenant hooks:**
- `useTenants()` — list tenants
- `useTenant(id)` — detail
- `useTenantTree()` — hierarchy tree
- `useCreateTenant()` — mutation
- `useUpdateTenant()` — mutation
- `useDeactivateTenant()` — mutation

**Org Unit hooks:**
- `useOrgUnits(tenantId)` — list org units
- `useOrgUnit(id)` — detail
- `useOrgTree(tenantId)` — org hierarchy tree
- `useCreateOrgUnit()` — mutation
- `useUpdateOrgUnit()` — mutation
- `useMoveOrgUnit()` — mutation
- `useDeleteOrgUnit()` — mutation

**Audit hooks:**
- `useAuditLogs(params)` — advanced filtered audit events
- `useAuditEvent(id)` — single event detail
- `useAuditEntityTimeline(entityType, entityId)` — entity audit trail
- `useAuditStats(dateRange)` — audit statistics
- `useExportAuditLogs()` — mutation (triggers download)
- `useVerifyAuditIntegrity()` — mutation

#### 2. Create Pages

**`app/dashboard/system/tenants/page.tsx`** — Tenant Management
- Tree view showing tenant hierarchy (department → divisions → offices)
- Each node shows: Name, code, type badge, user count, active/inactive status
- Expand/collapse for children
- Click tenant → detail panel or navigate to detail page
- "Add Tenant" button → dialog (name, code, type, parent selector)
- Edit and Deactivate actions

**`app/dashboard/system/org-units/page.tsx`** — Organisation Structure
- Interactive org chart visualization using a tree layout
- Each node: Unit name, level badge, manager name, user count
- Click node → side panel with unit details + list of users in that unit
- "Add Unit" button → dialog (name, code, level, parent selector, manager search)
- Drag-to-move capability (calls move API) — or "Move" button in context menu
- Breadcrumb trail showing hierarchy path

**`app/dashboard/system/audit-logs/page.tsx`** — Audit Log Explorer
This is a **power-user interface** for exploring the immutable audit trail. Key features:

- **Filter bar** (persistent, collapsible):
  - Date range picker (from/to with presets: today, last 7 days, last 30 days, custom)
  - Entity type dropdown (ticket, asset, policy, project, user, role, etc.)
  - Action dropdown (create, update, delete, approve, reject, login, logout, etc.)
  - Actor search (user autocomplete)
  - Keyword search (searches in changes JSON)
  - "Apply Filters" and "Clear" buttons

- **Results table** (DataTable):
  - Columns: Timestamp (relative + absolute tooltip), Actor (name + avatar), Action (color-coded badge), Entity Type, Entity ID (clickable link), Changes Summary, IP Address
  - Expandable row → shows full JSON diff of changes (before/after side-by-side)
  - Click entity link → navigates to the entity page

- **Stats panel** (collapsible top section):
  - Events today, this week, this month (bar chart: events per day last 30 days)
  - Top actors (pie/bar chart)
  - Top entity types (pie/bar chart)
  - Top actions (pie/bar chart)
  - Use Recharts for charts

- **Export button** → dropdown: Export CSV, Export JSON
  - Exports current filtered results (up to 10K rows)
  - Download triggers via API

- **Integrity verification**:
  - "Verify Integrity" button → calls verify API → shows result (pass/fail with details)
  - Shows last verification timestamp and status

- **Entity timeline view**:
  - When filtering by specific entity_type + entity_id, switch to timeline view
  - Vertical timeline showing all changes to that entity chronologically
  - Each event shows: actor, action, timestamp, changes diff

#### 3. JSON Diff Component

Create `components/shared/json-diff.tsx`:
- Takes `before` and `after` JSON objects
- Renders a side-by-side or inline diff view
- Highlights added (green), removed (red), changed (yellow) fields
- Handles nested objects
- Used in audit log expandable rows and entity timeline

### REQUIREMENTS TRACEABILITY
- **AP-06**: Tenant Isolation → Tenant management UI
- **FR-A020**: Organisational structure visualisation → Org chart page
- **SR-016–SR-020**: Audit trail → Audit log explorer with filtering, export, verification
- **SR-020**: Export CSV/JSON → Export functionality
- **BR-002**: Audit evidence within 4 hours → Power-user audit explorer

### VERIFICATION
1. `/dashboard/system/tenants` — Tree view renders, CRUD works
2. `/dashboard/system/org-units` — Org chart renders, nodes clickable
3. `/dashboard/system/audit-logs` — Filters work, table loads, expandable rows show diff
4. Export CSV/JSON downloads correctly
5. Verify integrity shows pass/fail result
6. `tsc --noEmit` passes

---

## PROMPT 7: System Frontend — Settings, Sessions, Health & Email Templates Pages

You are continuing the System frontend. Prompts 5-6 created users, roles, tenants, org structure, and audit logs pages. Now build the remaining system pages.

### YOUR TASK

#### 1. Add remaining hooks to `hooks/use-system.ts`

**Settings hooks:**
- `useSettings(category)` — settings by category
- `useSetting(category, key)` — single setting
- `useUpdateSetting()` — mutation
- `useResetSetting()` — mutation
- `useSettingCategories()` — list categories

**Session hooks:**
- `useSessions(params)` — active sessions
- `useSessionStats()` — session statistics
- `useRevokeSession()` — mutation
- `useForceLogoutUser()` — mutation

**Health hooks:**
- `usePlatformHealth()` — health status (auto-refresh every 30s)
- `useSystemStats()` — system-wide statistics
- `useDirectorySyncStatus()` — sync status
- `useTriggerDirectorySync()` — mutation

**Email Template hooks:**
- `useEmailTemplates(params)` — paginated list
- `useEmailTemplate(id)` — single template
- `useCreateEmailTemplate()` — mutation
- `useUpdateEmailTemplate()` — mutation
- `useDeleteEmailTemplate()` — mutation
- `usePreviewEmailTemplate()` — mutation

#### 2. Create Pages

**`app/dashboard/system/settings/page.tsx`** — System Settings
- Tab layout for categories: General, Security, Notifications, Branding, Integrations
- Each tab shows settings as a form:
  - **General tab**: Platform name, tagline, timezone, date format, items per page
  - **Security tab**: Session timeout, max sessions per user, enforce MFA toggle, allowed IP ranges (textarea), rate limit
  - **Notifications tab**: Email enabled toggle, Teams enabled toggle, quiet hours (time pickers), digest frequency dropdown
  - **Branding tab**: Primary color (color picker), logo URL, favicon URL — with live preview
  - **Integrations tab**: Entra ID toggle, Graph sync interval, sync enabled toggle — with sync status indicator
- Each setting has: current value, "Reset to default" button (if tenant-overridden)
- Save button per section
- Tenant scope indicator: "Global" badge or "Tenant Override" badge
- Settings are live-validated (e.g., timeout must be > 0, IP ranges must be valid CIDR)

**`app/dashboard/system/sessions/page.tsx`** — Session Management
- Stats cards at top: Active Sessions, Unique Users Online, Sessions by Device (pie chart)
- DataTable with columns: User (name+email), IP Address, Device/Browser, Location, Last Active (relative), Started, Actions (Revoke)
- Search by user name/email
- "Force Logout All" button per user (in expanded row or via user column action)
- Auto-refresh every 30 seconds
- Confirmation dialog before revoking sessions

**`app/dashboard/system/health/page.tsx`** — Platform Health Dashboard
- **Service Status Grid**: Cards for each service (PostgreSQL, Redis, MinIO, NATS) showing:
  - Status indicator (green dot = up, red = down, yellow = degraded)
  - Latency
  - Version/details
  - Last checked timestamp
- **System Statistics Section**:
  - Users: total, active, inactive, online now (with sparkline)
  - Database: size, tables, connections (gauge chart)
  - Storage: total objects, total size, evidence count
  - Module stats: table with record counts per module
- **Directory Sync Section**:
  - Current sync status (enabled/disabled, last sync time, next scheduled)
  - "Trigger Sync" button
  - Sync history table (last 10 runs): status badge, started, completed, users added/updated/removed, errors
- Auto-refresh health every 30 seconds
- Overall health indicator at top (large status badge: Healthy/Degraded/Unhealthy)

**`app/dashboard/system/email-templates/page.tsx`** — Email Template Management
- DataTable: Name, Category, Subject, Active toggle, Last Updated, Actions
- Filter by category
- "Create Template" button → opens editor page
- Click template → opens editor

**`app/dashboard/system/email-templates/[id]/page.tsx`** — Template Editor
- Split pane: Left = editor form, Right = live preview
- Fields: Name, Category (dropdown), Subject, Body HTML (rich textarea or code editor), Body Text (plain text fallback), Variables (JSON editor or key-value pairs)
- Live preview renders template with sample data
- "Send Test" button → sends test email to current user
- Save/Delete buttons

### REQUIREMENTS TRACEABILITY
- **NFR-024**: Configuration without deployment → Settings UI
- **SR-002**: Session timeout → Session management
- **NFR-009**: 99.5% availability → Health monitoring dashboard
- **AP-05**: Operational Excellence → Platform health dashboard
- **IR-006**: Org sync → Directory sync status

### VERIFICATION
1. `/dashboard/system/settings` — All 5 tabs render with current values, save works
2. `/dashboard/system/sessions` — Active sessions list with device info, revoke works
3. `/dashboard/system/health` — Service status shows, auto-refreshes, sync trigger works
4. `/dashboard/system/email-templates` — CRUD works, preview renders
5. `tsc --noEmit` passes

---

## PROMPT 8: System Overview Dashboard — Analytics & Cross-Module KPIs

You are continuing the System frontend. All system pages exist. Now build a rich System Overview dashboard that serves as the landing page for `/dashboard/system`.

### YOUR TASK

Replace the simple overview created in Prompt 5 with a comprehensive admin dashboard.

#### 1. Update `app/dashboard/system/page.tsx` — System Overview Dashboard

Design a data-rich admin dashboard with these sections:

**Row 1: Key Metrics Cards** (4 cards across)
- Total Users (with active %, trend arrow vs last month)
- Active Sessions (with "online now" count)
- Audit Events Today (with sparkline showing 7-day trend)
- Platform Health (with service count: 4/4 healthy)

**Row 2: Users & Access** (2 charts side by side)
- **Users by Role** — Horizontal bar chart (Recharts) showing user count per role
- **New Users Over Time** — Area chart showing user registrations per week (last 12 weeks)

**Row 3: Audit Activity** (full width)
- **Audit Events Timeline** — Area/bar chart showing events per day (last 30 days)
- Color-coded by action type (create=green, update=blue, delete=red, login=gray)
- Hover shows breakdown

**Row 4: Module Usage** (2 sections)
- **Module Record Counts** — Bar chart showing record counts per module (Governance, Planning, ITSM, CMDB, People, Knowledge, GRC)
- **Quick Actions** panel: Cards linking to key system actions:
  - "Manage Users" → /dashboard/system/users
  - "View Audit Logs" → /dashboard/system/audit-logs
  - "System Settings" → /dashboard/system/settings
  - "Check Health" → /dashboard/system/health
  - "Run Directory Sync" → triggers sync
  - "Export Audit Report" → triggers export dialog

**Row 5: Recent Activity** (full width)
- DataTable showing last 10 system-level audit events (user changes, role assignments, settings changes, login events)
- Quick filter tabs: All, User Changes, Role Changes, Settings, Logins

#### 2. Use proper loading states

- Skeleton loaders for each section
- Error boundaries per section (one failing section doesn't break the whole dashboard)
- Data auto-refreshes every 60 seconds

#### 3. Responsive layout

- 4 columns → 2 columns on tablet → 1 column on mobile
- Charts resize properly
- Tables become card layout on mobile

### REQUIREMENTS TRACEABILITY
- **NFR-004**: Dashboard rendering ≤5 seconds → Optimized queries, cached stats
- **BR-004**: Real-time visibility → Cross-module statistics
- **AP-05**: Operational Excellence → Admin dashboard

### VERIFICATION
1. `/dashboard/system` renders full dashboard with all sections
2. Charts render with real data from API
3. Quick actions navigate correctly
4. Auto-refresh works
5. Responsive on mobile
6. `tsc --noEmit` passes

---

## PROMPT 9: End-to-End Integration — API Wiring, Permission Guards & Navigation Polish

You are doing final integration for the System module. All backend and frontend code exists. Now ensure everything is properly wired, permission-guarded, and polished.

### YOUR TASK

#### 1. Server Route Registration

Ensure `internal/platform/server/server.go` correctly mounts all system routes:

```go
// System Administration — requires system.view or system.manage
r.Route("/system", func(r chi.Router) {
    // Read-only endpoints: system.view
    r.Group(func(r chi.Router) {
        r.Use(middleware.RequirePermission("system.view"))
        r.Get("/health", systemHandler.GetHealth)
        r.Get("/stats", systemHandler.GetStats)
        r.Get("/directory-sync", systemHandler.GetDirectorySyncStatus)
        r.Route("/audit-logs", func(r chi.Router) {
            systemHandler.AuditExplorerRoutes(r)
        })
    })

    // Admin endpoints: system.manage
    r.Group(func(r chi.Router) {
        r.Use(middleware.RequirePermission("system.manage"))
        r.Route("/users", func(r chi.Router) { systemHandler.UserRoutes(r) })
        r.Route("/roles", func(r chi.Router) { systemHandler.RoleRoutes(r) })
        r.Route("/tenants", func(r chi.Router) { systemHandler.TenantRoutes(r) })
        r.Route("/org-units", func(r chi.Router) { systemHandler.OrgRoutes(r) })
        r.Route("/sessions", func(r chi.Router) { systemHandler.SessionRoutes(r) })
        r.Route("/settings", func(r chi.Router) { systemHandler.SettingsRoutes(r) })
        r.Route("/email-templates", func(r chi.Router) { systemHandler.EmailTemplateRoutes(r) })
        r.Post("/directory-sync/trigger", systemHandler.TriggerDirectorySync)
    })
})
```

#### 2. Update Permission Seeds

Ensure migration 002 (or a new migration 017 if needed) includes system permissions in the global_admin role:

```json
{
    "system.view": true,
    "system.manage": true,
    "system.users.view": true,
    "system.users.manage": true,
    "system.roles.view": true,
    "system.roles.manage": true,
    "system.tenants.manage": true,
    "system.settings.manage": true,
    "system.sessions.manage": true,
    "system.audit.view": true,
    "system.audit.export": true,
    "system.audit.verify": true
}
```

Also add `system.view` to the `auditor` role and `itd_director` role.

#### 3. Frontend Permission Guards

Ensure all system pages check permissions:
- Each page component wraps content in a permission check
- Redirect to 403 or show "Access Denied" component if user lacks permission
- Sidebar items already filtered by permission (verify this works)

#### 4. Breadcrumb Navigation

Add breadcrumbs to system pages:
```
System > Users > John Doe
System > Roles > Global Admin
System > Audit Logs
System > Settings > Security
```

#### 5. Toast Notifications

Ensure all mutations show success/error toasts (using Sonner):
- "User deactivated successfully"
- "Role assigned successfully"
- "Settings saved"
- "Session revoked"
- "Delegation created"
- Error toasts for all API errors

#### 6. Update Main Dashboard

Update `app/dashboard/page.tsx` to add a System module card:
```typescript
{
    title: "System",
    description: "Audit logs, system settings, roles, and permissions",
    icon: Settings,
    href: "/dashboard/system",
    color: "#64748B",
    bgColor: "rgba(100, 116, 139, 0.1)",
    permission: "system.view",
}
```
(This may already exist — verify and update if needed.)

#### 7. Fix any TypeScript/Build Errors

- Run `tsc --noEmit` and fix all type errors
- Run `go build ./...` and `go vet ./...` and fix all Go errors
- Ensure all imports are correct

### REQUIREMENTS TRACEABILITY
- **SR-004**: RBAC enforcement → Permission guards on all endpoints and pages
- **NFR-017**: Role-aware navigation → Permission-filtered sidebar
- **NFR-016**: Consistent responsive UI → Breadcrumbs, toasts, consistent layouts

### VERIFICATION
1. `go build ./...` passes
2. `go vet ./...` passes
3. `tsc --noEmit` passes
4. Navigate all system pages — no 404s, no broken links
5. Non-admin user cannot access system pages (gets 403)
6. All CRUD operations show appropriate toasts
7. Breadcrumbs display correctly on all pages

---

## PROMPT 10: Testing, Documentation & Final Polish

You are completing the System module. All features are implemented. Now add tests, ensure code quality, and create documentation.

### YOUR TASK

#### 1. Backend Unit Tests

Create test files in `internal/modules/system/`:

**`user_service_test.go`**:
- Test ListUsers pagination (page 1 of 2, correct counts)
- Test ListUsers search filter (finds by name partial match)
- Test ListUsers role filter
- Test DeactivateUser (sets inactive, revokes bindings)
- Test ReactivateUser
- Test AssignRole (creates binding, returns it)
- Test AssignRole duplicate (rejects duplicate active binding)
- Test CreateDelegation (validates no self-delegation)
- Test CreateDelegation (validates end > start date)

**`role_service_test.go`**:
- Test ListRoles (returns all with user counts)
- Test CreateRole (creates custom role)
- Test CreateRole duplicate name (rejects)
- Test UpdateRole on system role (rejects)
- Test DeleteRole with active bindings (rejects)
- Test DeleteRole on system role (rejects)
- Test GetPermissionCatalog (returns grouped permissions)

**`settings_service_test.go`**:
- Test GetSetting global default
- Test GetSetting with tenant override (tenant value wins)
- Test UpdateSetting creates audit event
- Test ResetSetting removes tenant override

**`audit_explorer_service_test.go`**:
- Test ListEvents with date range filter
- Test ListEvents with entity type filter
- Test GetEntityTimeline returns ordered events
- Test ExportEvents respects row limit

**`handler_test.go`** (HTTP handler tests):
- Test GET /system/users returns 200 with paginated response
- Test GET /system/users returns 403 without system.manage permission
- Test POST /system/users/:id/roles returns 201
- Test DELETE /system/roles/:id on system role returns 400
- Test GET /system/health returns service statuses

#### 2. Frontend Component Tests (optional but recommended)

If the project uses Vitest/Jest, add basic tests for:
- `use-system.ts` hooks (mock API, verify query keys, invalidation)
- Settings form validation
- Permission guard component behavior

#### 3. API Documentation

Update `docs/api-reference.md` to add the System module section:

```markdown
## System Administration

### Users
- GET /api/v1/system/users — List users (query params: page, pageSize, search, role, status, department, sortBy, sortOrder)
- GET /api/v1/system/users/:id — Get user detail (includes roles, delegations)
- PATCH /api/v1/system/users/:id — Update user profile
- POST /api/v1/system/users/:id/deactivate — Deactivate user
- POST /api/v1/system/users/:id/reactivate — Reactivate user
- POST /api/v1/system/users/:id/roles — Assign role to user
- DELETE /api/v1/system/users/:id/roles/:bindingId — Revoke role
- GET /api/v1/system/users/:id/delegations — List delegations
- POST /api/v1/system/users/:id/delegations — Create delegation
- DELETE /api/v1/system/users/:id/delegations/:delegationId — Revoke delegation
- GET /api/v1/system/users/search — Search users (query: q)

### Roles & Permissions
- GET /api/v1/system/roles — List all roles
- GET /api/v1/system/roles/:id — Get role detail
- POST /api/v1/system/roles — Create custom role
- PATCH /api/v1/system/roles/:id — Update role
- DELETE /api/v1/system/roles/:id — Delete custom role
- GET /api/v1/system/permissions — Permission catalog

### Tenants
- GET /api/v1/system/tenants — List tenants
- GET /api/v1/system/tenants/tree — Tenant hierarchy
- GET /api/v1/system/tenants/:id — Get tenant detail
- POST /api/v1/system/tenants — Create tenant
- PATCH /api/v1/system/tenants/:id — Update tenant
- POST /api/v1/system/tenants/:id/deactivate — Deactivate tenant

### Org Units
- GET /api/v1/system/org-units — List org units
- GET /api/v1/system/org-units/tree — Org hierarchy tree
- GET /api/v1/system/org-units/:id — Get org unit detail
- POST /api/v1/system/org-units — Create org unit
- PATCH /api/v1/system/org-units/:id — Update org unit
- POST /api/v1/system/org-units/:id/move — Move org unit
- DELETE /api/v1/system/org-units/:id — Delete org unit

### Audit Logs
- GET /api/v1/system/audit-logs — List events (query: dateFrom, dateTo, entityType, action, actorId, search, page, pageSize)
- GET /api/v1/system/audit-logs/:id — Get event detail
- GET /api/v1/system/audit-logs/entity/:type/:id — Entity audit timeline
- GET /api/v1/system/audit-logs/stats — Audit statistics
- GET /api/v1/system/audit-logs/export — Export events (query: format=csv|json)
- POST /api/v1/system/audit-logs/verify — Verify audit integrity

### Sessions
- GET /api/v1/system/sessions — List active sessions
- GET /api/v1/system/sessions/stats — Session statistics
- DELETE /api/v1/system/sessions/:id — Revoke session
- DELETE /api/v1/system/sessions/user/:userId — Force logout user

### Settings
- GET /api/v1/system/settings?category=... — List settings
- GET /api/v1/system/settings/:category/:key — Get setting
- PUT /api/v1/system/settings/:category/:key — Update setting
- DELETE /api/v1/system/settings/:category/:key — Reset to default
- GET /api/v1/system/settings/categories — List categories

### Email Templates
- GET /api/v1/system/email-templates — List templates
- GET /api/v1/system/email-templates/:id — Get template
- POST /api/v1/system/email-templates — Create template
- PATCH /api/v1/system/email-templates/:id — Update template
- DELETE /api/v1/system/email-templates/:id — Delete template
- POST /api/v1/system/email-templates/:id/preview — Preview template

### Platform Health
- GET /api/v1/system/health — Detailed platform health
- GET /api/v1/system/stats — System-wide statistics
- GET /api/v1/system/directory-sync — Directory sync status
- POST /api/v1/system/directory-sync/trigger — Trigger manual sync
```

#### 4. Update MEMORY.md

Update the project memory with System module completion details.

#### 5. Final Build Verification

Run all build and quality checks:
```bash
cd itd-opms-api && go build ./... && go vet ./...
cd itd-opms-portal && npx tsc --noEmit
cd itd-opms-api && go test ./internal/modules/system/... -v
```

### REQUIREMENTS TRACEABILITY
- **NFR-022**: Version-controlled code → All code committed
- **NFR-023**: OpenAPI documented → API reference updated
- **17.1 Verification Methods**: Unit testing → 30+ test cases
- **BR-002**: Audit evidence within 4 hours → Full audit explorer with export

### VERIFICATION
1. `go test ./internal/modules/system/... -v` — all tests pass
2. `go build ./...` passes
3. `go vet ./...` passes
4. `tsc --noEmit` passes
5. API documentation complete and accurate
6. All 10 system pages render and function correctly
7. End-to-end flow works: Login → Navigate to System → Manage users/roles/settings/audit

---

## Summary

| Prompt | Scope | Backend Files | Frontend Files | Key Deliverables |
|--------|-------|---------------|----------------|------------------|
| 1 | User & Role Management Backend | 6 Go files, ~30 sqlc queries | — | User CRUD, role management, delegation, permission catalog |
| 2 | Tenant & Org Management Backend | 4 Go files, ~20 sqlc queries | — | Tenant CRUD, org tree, hierarchy management |
| 3 | Settings, Audit Explorer & Sessions Backend | 8 Go files, ~40 sqlc queries, 1 migration | — | System settings, enhanced audit explorer, session mgmt, email templates |
| 4 | Health, Stats & Directory Sync Backend | 2 Go files, ~10 sqlc queries | — | Platform health, cross-module stats, sync status |
| 5 | Frontend: Layout, Users & Roles | — | ~8 pages, ~30 hooks | System layout, user management UI, role management UI |
| 6 | Frontend: Tenants, Org & Audit Logs | — | ~5 pages, ~15 hooks, 1 component | Tenant tree, org chart, audit log explorer with charts |
| 7 | Frontend: Settings, Sessions, Health & Templates | — | ~6 pages, ~15 hooks | Settings forms, session manager, health dashboard, template editor |
| 8 | System Overview Dashboard | — | 1 page (rich) | Admin dashboard with analytics, charts, quick actions |
| 9 | Integration, Guards & Polish | 1 migration, server wiring | Navigation, guards, toasts | End-to-end wiring, permissions, breadcrumbs, toasts |
| 10 | Testing & Documentation | ~5 test files (30+ tests) | — | Unit tests, API docs, build verification |
| **Total** | **Complete System Module** | **~20 Go files, 1 migration, ~100 sqlc queries** | **~20 pages, ~60 hooks** | **Full admin module** |

### Requirements Coverage
- **SR-004, SR-005, SR-007, SR-008**: RBAC, ABAC, delegations, auth logging → User/Role management
- **SR-002, SR-003**: Session timeout, revocation → Session management
- **SR-016–SR-020**: Audit trail → Audit log explorer with export and integrity verification
- **NFR-024**: Configuration without deployment → System settings
- **NFR-009, AP-05**: Availability, operational excellence → Health dashboard
- **BR-007, AP-06**: Progressive rollout, tenant isolation → Tenant management
- **FR-A020**: Org structure visualization → Org chart
- **IR-006**: Directory sync → Sync status and trigger
- **BR-014**: Delegation of authority → Delegation management

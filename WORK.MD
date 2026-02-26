Now I have a thorough understanding of both documents and both codebases. Let me synthesize everything and generate the 10 prompts.

10 AI Agent Prompts for End-to-End Implementation of ITD-AMD-OPMS
Based on my deep study of both documents (280+ requirements across 7 domains, 100 capabilities) and the existing talent-api (NestJS/TypeScript) and talent-portal (Next.js 16/React 19) codebases, here are 10 comprehensive, self-contained AI agent prompts. Each prompt is scoped to a logical work stream, ordered by the phased delivery strategy (Foundation → Governance+PMO → ITSM → CMDB → GRC → Stabilisation).

PROMPT 1: Foundation — Project Scaffolding, Multi-Tenant Data Architecture & Audit Event Framework

You are a senior full-stack engineer building ITD-OPMS (Operations & Performance Management System) 
for the Central Bank of Nigeria's IT Department. This is a TOGAF 10-aligned, audit-ready, multi-tenant 
enterprise platform with 7 capability domains and 100+ capabilities.

## TECH STACK (MANDATORY — per Solution Architecture ADR decisions)
- **Backend**: Golang modular monolith with bounded contexts (NOT NestJS — we are migrating from 
  the TypeScript talent-api baseline to Go as mandated by CBN architecture standards ADR-001)
- **Frontend**: Next.js 16 + TypeScript + shadcn/ui + Tailwind CSS (reuse patterns from talent-portal)
- **Database**: PostgreSQL 16 with tenant_id on all scoped tables, JSONB for flexible attributes
- **Object Storage**: MinIO (S3-compatible) for evidence vault and attachments
- **Event Bus**: NATS JetStream for async domain events, notifications, and retry/DLQ
- **Cache**: Redis 7 for caching, rate limiting, background jobs
- **Identity**: Microsoft Entra ID via OIDC/PKCE (NO local credentials stored)
- **Observability**: OpenTelemetry → Prometheus + Grafana + Loki + Tempo
- **Deployment**: Docker Compose on Linux VMs

## YOUR TASK — Phase 1: Foundation (Weeks 1-2)

### 1. Project Structure & Scaffolding
Create the Go backend project as a modular monolith with this structure:
itd-opms-api/
├── cmd/api/main.go              # Entry point
├── internal/
│   ├── platform/                # Cross-cutting platform layer
│   │   ├── config/              # Environment & app config (Viper)
│   │   ├── database/            # PostgreSQL connection, migrations (golang-migrate)
│   │   ├── middleware/          # Auth, tenant resolution, RBAC/ABAC, correlation ID, rate limit
│   │   ├── audit/               # Immutable audit event framework (append-only)
│   │   ├── auth/                # Entra ID OIDC/JWT validation, session management
│   │   ├── tenant/              # Tenant resolution, org hierarchy, scope enforcement
│   │   ├── rbac/                # Role-based + Attribute-based access control engine
│   │   ├── notification/        # Notification orchestrator (outbox pattern + NATS)
│   │   ├── workflow/            # Configurable workflow & approvals engine
│   │   ├── sla/                 # SLA engine (timers, business hours, breach detection)
│   │   ├── evidence/            # Evidence vault (MinIO integration, checksums, retention)
│   │   ├── search/              # Global search engine
│   │   └── server/              # HTTP server setup, router, OpenAPI
│   ├── modules/                 # Domain modules (bounded contexts)
│   │   ├── governance/          # Domain A
│   │   ├── people/              # Domain B
│   │   ├── planning/            # Domain C
│   │   ├── itsm/                # Domain D
│   │   ├── cmdb/                # Domain E
│   │   ├── knowledge/           # Domain F
│   │   ├── grc/                 # Domain G
│   │   └── reporting/           # Cross-cutting reporting
│   └── shared/                  # Shared types, helpers, errors
├── migrations/                  # SQL migration files (numbered)
├── docker-compose.yml           # All services (api, postgres, redis, minio, nats, grafana stack)
├── Dockerfile                   # Multi-stage Go build
├── .env.example                 # Environment template
└── Makefile                     # Build, migrate, seed, test commands



### 2. Database Foundation (Migrations 001-005)
Create SQL migrations for core platform entities:

**001_tenants_and_org_hierarchy.sql:**
- `tenants` (id UUID PK, name, code, type ENUM('division','office'), parent_id FK, is_active, config JSONB, created_at, updated_at)
- `org_units` (id, tenant_id FK, name, code, level ENUM('department','division','office','unit'), parent_id, manager_user_id, is_active, metadata JSONB)
- `org_hierarchy` (ancestor_id, descendant_id, depth) — closure table for efficient hierarchy queries

**002_users_and_rbac.sql:**
- `users` (id UUID PK, entra_id TEXT UNIQUE NOT NULL, email, display_name, job_title, department, office, unit, tenant_id FK, photo_url, is_active, last_login_at, metadata JSONB, created_at, updated_at)
- `roles` (id, name UNIQUE, description, permissions JSONB, is_system BOOLEAN, created_at)
- `role_bindings` (id, user_id FK, role_id FK, tenant_id FK, scope_type ENUM, scope_id UUID, granted_by, granted_at, expires_at, is_active)
- `delegations` (id, delegator_id FK, delegate_id FK, role_id FK, tenant_id FK, reason, approved_by, starts_at, ends_at, is_active, created_at)
- Seed the 7 system roles: itd_director, head_of_division, supervisor, staff, auditor, global_admin, service_desk_agent

**003_audit_events.sql (CRITICAL — append-only, immutable):**
- `audit_events` (event_id UUID PK DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, actor_id UUID NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID NOT NULL, changes JSONB, evidence_refs UUID[], ip_address INET, user_agent TEXT, correlation_id UUID, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), checksum TEXT NOT NULL)
- **NO UPDATE/DELETE permissions**: REVOKE UPDATE, DELETE ON audit_events FROM application_role;
- Create index on (tenant_id, timestamp), (entity_type, entity_id), (actor_id)
- Add trigger to compute SHA-256 checksum on INSERT

**004_approvals_and_signoffs.sql:**
- `approval_chains` (id, entity_type, entity_id, tenant_id, workflow_definition_id, status ENUM('pending','in_progress','approved','rejected','cancelled'), created_by, created_at, completed_at)
- `approval_steps` (id, chain_id FK, step_order INT, approver_id FK, decision ENUM, comments TEXT, decided_at, evidence_refs UUID[], delegated_from UUID)
- `signoffs` (id, entity_type, entity_id, tenant_id, signer_id, signer_role, signed_at, comments, checksum)

**005_documents_and_evidence.sql:**
- `documents` (id, tenant_id, title, description, file_key TEXT — MinIO path, content_type, size_bytes, checksum_sha256, classification ENUM('audit_evidence','operational','configuration','transient'), retention_until, uploaded_by, created_at)
- `evidence_items` (id, tenant_id, entity_type, entity_id, document_id FK, description, collected_by, collected_at, is_immutable BOOLEAN DEFAULT true)

### 3. Authentication & Tenant Resolution Middleware
Implement the authentication flow:
- OIDC/PKCE flow with Microsoft Entra ID (validate JWT on every request)
- Token validation: issuer, audience, signature, expiry checks
- Extract user claims (oid, name, email, groups) from JWT
- Map Entra ID security groups to platform roles
- Tenant resolution from JWT claims + org_hierarchy lookup
- Inject AuthContext (user_id, tenant_id, roles, scopes) into request context
- 30-minute session timeout with token refresh support

### 4. RBAC/ABAC Authorization Engine
Implement hybrid authorization:
- **RBAC**: 7 roles with permission sets (create, read, update, delete, approve, export per module)
- **ABAC**: Scope boundaries by tenant_id, division, office, unit attributes
- Middleware that evaluates RBAC permissions AND ABAC scope on every request
- Support for delegations (time-bound role elevation)
- Log all authorization decisions (grant/deny) to audit_events

### 5. Audit Event Framework
- Implement audit event service that captures: who, what, when, where, why
- SHA-256 checksum computation on every audit event
- Support for evidence_refs linking audit events to MinIO objects
- Expose audit query API with filtering by tenant, entity, actor, date range
- Ensure append-only semantics (no update/delete at application level)

### 6. Docker Compose Setup
Create docker-compose.yml with all services:
- api (Go binary), postgres:16, redis:7-alpine, minio:latest, nats:2-alpine
- grafana, prometheus, loki, tempo for observability
- nginx-proxy with TLS termination
- Health checks on all containers
- Network isolation: frontend, backend, monitoring networks
- Volume mounts for persistent data

### 7. Frontend Foundation (Next.js Shell)
Scaffold the Next.js 16 portal reusing patterns from talent-portal:
itd-opms-portal/
├── app/
│   ├── auth/callback/          # OIDC callback handler
│   ├── dashboard/              # Role-aware dashboard shell
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Landing/login redirect
├── components/
│   ├── layout/                 # Sidebar (role-aware), header, mobile nav, command palette
│   └── shared/                 # DataTable, FormField, StatusBadge, ConfirmDialog (from talent-portal)
├── hooks/
│   └── use-auth.ts             # OIDC auth hook with Entra ID
├── lib/
│   ├── api-client.ts           # HTTP client with bearer token, tenant header
│   └── auth.ts                 # OIDC/PKCE token management (NOT localStorage JWT)
├── providers/
│   ├── auth-provider.tsx       # Entra ID OIDC auth context
│   ├── query-provider.tsx      # React Query setup
│   └── theme-provider.tsx      # CBN-branded dark/light mode
└── types/                      # Shared TypeScript types



Implement:
- OIDC/PKCE login flow redirecting to Microsoft Entra ID
- Token storage using secure httpOnly cookies (NOT localStorage)
- Role-aware sidebar navigation showing only permitted modules
- Tenant-scoped API client with automatic bearer token injection
- CBN-branded theme with design tokens (primary colors, typography)

## CONSTRAINTS
- All tables with operational data MUST have tenant_id column
- All API responses follow standard envelope: { "data": ..., "meta": {...}, "errors": [...] }
- All state-changing operations MUST emit audit events
- API versioning: /api/v1/...
- All endpoints documented with OpenAPI 3.0
- Use parameterized queries (NO raw SQL string concatenation)
- Correlation IDs on every request for distributed tracing

## REFERENCE PATTERNS
Study the talent-api codebase at /Users/mac/codes/itd-opms/talent-api for:
- Module structure patterns (controller → service → entity → dto)
- Guard/middleware patterns (JWT, roles, permissions)
- Base entity pattern (UUID PK, timestamps, soft delete, version)
- Response envelope pattern (TransformResponseInterceptor)
- Audit logging pattern

Study the talent-portal codebase at /Users/mac/codes/itd-opms/talent-portal for:
- Auth provider pattern
- API client pattern with token injection
- Role-aware sidebar navigation
- DataTable, FormField, StatusBadge reusable components
- React Query hooks pattern (queries + mutations + cache invalidation)
- Theme provider with dark mode

Adapt these TypeScript/NestJS patterns to Go idioms while maintaining the same architectural principles.
PROMPT 2: Microsoft 365 Integration Layer — Entra ID SSO, Graph API Sync, Email & Teams Notifications

You are building the Microsoft 365 integration layer for ITD-OPMS, the Central Bank of Nigeria's 
IT operations platform. This is the most critical integration — the platform MUST authenticate via 
Entra ID (no local credentials) and communicate via Graph API.

## CONTEXT
The foundation (Prompt 1) established: Go modular monolith, PostgreSQL with tenant_id isolation, 
audit event framework, RBAC/ABAC engine, and Next.js shell with OIDC auth flow.

## YOUR TASK — Integration Layer (Requirements IR-001 through IR-012)

### 1. Entra ID OIDC Authentication (IR-001 to IR-005)
**Backend (Go):**
- Implement OIDC discovery endpoint configuration for Microsoft Entra ID
- JWT validation middleware: verify issuer (https://login.microsoftonline.com/{tenant}/v2.0), 
  audience, signature (RS256 with JWKS), expiry, and nbf claims
- Extract user claims: oid (sub), preferred_username, name, email, groups
- Map security group claims to platform roles (itd_director, head_of_division, etc.)
- Handle Conditional Access — respect MFA enforcement from Entra ID policies
- Token refresh endpoint: accept refresh_token, exchange for new access_token
- Session revocation: listen for Entra ID security events (optional webhook)

**Frontend (Next.js):**
- Implement OIDC/PKCE authorization code flow:
  1. Redirect to Entra ID authorize endpoint with code_challenge (S256)
  2. Handle callback with authorization code
  3. Exchange code for tokens at token endpoint (with code_verifier)
  4. Store access_token in httpOnly secure cookie (NOT localStorage)
  5. Implement silent token refresh using refresh_token before expiry
- Session timeout: redirect to login after 30 minutes of inactivity
- Logout: clear cookies + redirect to Entra ID logout endpoint

### 2. Organizational Directory Sync (IR-006, IR-007)
Implement delta sync from Microsoft Graph to maintain local directory snapshot:

**Sync Service (Background Job):**
- Use Graph API `/users?$select=id,displayName,mail,jobTitle,department,officeLocation,manager&$deltatoken=...`
- Process delta changes: new users, updated attributes, disabled accounts
- Map Graph attributes to local user records:
  - `department` → tenant resolution
  - `officeLocation` → office/unit mapping
  - Manager relationships → org_hierarchy updates
- Schedule: run every 15 minutes via NATS-triggered job
- Store delta sync token for efficient subsequent queries
- Generate reconciliation report after each sync run
- Emit audit events for all user additions/modifications/deactivations

**Database Tables:**
- `directory_sync_runs` (id, started_at, completed_at, delta_token, users_created, users_updated, 
  users_deactivated, errors JSONB, status)
- Update existing `users` table with synced attributes

### 3. Email Notification Delivery (IR-008, IR-011, IR-012)
Implement email delivery via Microsoft Graph sendMail API:

**Email Service:**
- Use Graph API `/users/{service-account-id}/sendMail` with application permissions
- Template-driven rendering using Go's html/template package
- Standard templates (version-controlled, configurable by ITD Global Admin):
  - SLA breach warning / breach notification
  - Approval request with one-click approve/reject links
  - Assignment/reassignment notification
  - Escalation notification
  - License/warranty renewal reminder
  - Audit evidence collection request
  - Major incident communication
- Outbox pattern implementation:
  1. Business logic writes notification_outbox record in same DB transaction
  2. Background processor polls outbox every 5 seconds
  3. Delivers via Graph API
  4. Marks as delivered with timestamp
  5. Failed deliveries retried with exponential backoff (3 attempts: 30s, 2min, 10min)
  6. Permanently failed → dead letter queue (DLQ) + alert
- Rate limit handling: respect Graph API 429 responses, implement batching
- Audit log all email sends (recipient, template, status, timestamp)

**Database Tables:**
- `notification_outbox` (id, tenant_id, channel ENUM('email','teams','in_app'), recipient_id, 
  recipient_email, template_key, template_data JSONB, priority, status ENUM('pending','processing',
  'delivered','failed','dlq'), attempts INT, last_attempt_at, delivered_at, error_message, 
  correlation_id, created_at)
- `notification_templates` (id, key UNIQUE, name, channel, subject_template, body_template, 
  version INT, is_active, created_by, created_at, updated_at)
- `notification_dlq` (id, outbox_id FK, error_details JSONB, moved_at)

### 4. Microsoft Teams Notification Delivery (IR-009, IR-010)
Implement Teams channel posting via Graph API:

**Teams Service:**
- Use Graph API `/teams/{team-id}/channels/{channel-id}/messages` with application permissions
- Support for Adaptive Cards (IR-010):
  - Approval cards with Approve/Reject action buttons
  - SLA breach cards with ticket details and action links
  - Major incident cards with status updates
- Channel mapping: configurable per tenant (which Teams channel receives which notification types)
- Same outbox pattern as email delivery
- Support for @mentions of specific users in Teams messages

**Database Tables:**
- `teams_channel_mappings` (id, tenant_id, channel_id TEXT, team_id TEXT, notification_types TEXT[], 
  is_active, configured_by, created_at)

### 5. Notification Orchestrator (Ties it all together)
Implement the cross-cutting notification engine:

**Orchestrator Service:**
- Listen for domain events via NATS JetStream subjects:
  - `itsm.ticket.created`, `itsm.sla.breached`, `itsm.ticket.escalated`
  - `governance.approval.required`, `governance.policy.published`
  - `cmdb.warranty.expiring`, `cmdb.license.noncompliant`
  - `grc.audit.scheduled`, `grc.access_review.required`
- Resolve notification recipients based on event type and tenant configuration
- Check user notification preferences (channel preferences, quiet hours, digest frequency)
- Route to appropriate channel(s): email, Teams, in-app
- Support for digest mode: batch low-priority notifications into daily/weekly digests
- DLQ monitoring: alert when DLQ depth exceeds threshold

**Database Tables:**
- `user_notification_preferences` (id, user_id FK, channel_preferences JSONB, 
  digest_frequency ENUM('immediate','daily','weekly'), quiet_hours_start TIME, 
  quiet_hours_end TIME, disabled_types TEXT[], updated_at)

### 6. Frontend: Notification Center
In the Next.js portal, implement:
- Notification bell icon with unread count badge
- Notification dropdown panel with:
  - Grouped by date
  - Mark as read/unread
  - Click to navigate to relevant entity
  - Mark all as read
- Notification preferences settings page
- WebSocket/SSE connection for real-time in-app notifications (best-effort)

## GRAPH API PERMISSIONS NEEDED
Document these for the Entra ID app registration:
- Application: User.Read.All, GroupMember.Read.All, Mail.Send, ChannelMessage.Send
- Delegated: openid, profile, email, User.Read, offline_access

## ERROR HANDLING
- All Graph API calls wrapped in circuit breaker (half-open/open/closed states)
- Exponential backoff on transient failures (429, 503, 504)
- DLQ for permanent failures with alerting
- Graceful degradation: if Graph is unavailable, queue notifications for later delivery

## REFERENCE
- Reuse notification patterns from talent-api (notifications module, email service)
- Reuse notification UI patterns from talent-portal (notification-panel, notification-provider)
PROMPT 3: Domain A — Division Governance & Organisation Module

You are building Domain A (Division Governance & Organisation) for ITD-OPMS. This module implements 
capabilities A1-A12 covering policy management, RACI matrices, meetings/decisions, OKR cascade, 
and organisational structure. Requirements: FR-A001 through FR-A022.

## CONTEXT
Foundation is in place: Go API with tenant isolation, RBAC/ABAC, audit events, approval workflow 
engine, and Next.js shell with role-aware navigation. Entra ID SSO and Graph API integration are operational.

## YOUR TASK — Governance Module (Phase 2: Weeks 3-5)

### 1. Policy Management (FR-A001 to FR-A007) [MUST HAVE]

**Backend — Database Entities:**
```sql
-- Migration: 010_governance_policies.sql
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'security', 'operational', 'compliance', 'hr'
  tags TEXT[],
  scope_type TEXT NOT NULL DEFAULT 'tenant', -- 'enterprise' or 'tenant'
  scope_tenant_ids UUID[], -- NULL = all tenants (enterprise-wide)
  status TEXT NOT NULL DEFAULT 'draft', -- draft, in_review, approved, published, retired
  version INT NOT NULL DEFAULT 1,
  content TEXT NOT NULL, -- Rich text / Markdown policy content
  effective_date DATE,
  review_date DATE, -- Next review due date
  expiry_date DATE,
  owner_id UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id),
  version INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  changes_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(policy_id, version)
);

CREATE TABLE policy_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id),
  policy_version INT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL,
  attested_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, attested, overdue
  campaign_id UUID, -- Links to attestation campaign
  reminder_sent_at TIMESTAMPTZ,
  UNIQUE(policy_id, policy_version, user_id)
);

CREATE TABLE attestation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  policy_id UUID NOT NULL REFERENCES policies(id),
  policy_version INT NOT NULL,
  target_scope TEXT NOT NULL, -- 'all_tenant', 'division', 'specific_users'
  target_user_ids UUID[],
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  completion_rate DECIMAL(5,2) DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
Backend — API Endpoints:

POST /api/v1/governance/policies — Create policy (draft)
GET /api/v1/governance/policies — List policies (filterable by category, status, scope)
GET /api/v1/governance/policies/:id — Get policy detail with version history
PUT /api/v1/governance/policies/:id — Update policy (creates new version)
POST /api/v1/governance/policies/:id/submit — Submit for review (draft → in_review)
POST /api/v1/governance/policies/:id/approve — Approve (triggers approval chain)
POST /api/v1/governance/policies/:id/publish — Publish (requires approval)
POST /api/v1/governance/policies/:id/retire — Retire policy
GET /api/v1/governance/policies/:id/versions — Get version history
GET /api/v1/governance/policies/:id/diff?v1=X&v2=Y — Diff two versions
POST /api/v1/governance/policies/:id/attestation-campaigns — Launch attestation campaign
GET /api/v1/governance/policies/:id/attestation-status — Attestation completion rates
POST /api/v1/governance/attestations/:id/attest — User attests to policy
Business Logic:

Policy lifecycle: Draft → In Review → Approved → Published → (Review cycle) → Retired
Approval workflow: policy publication requires designated approver signoff (use workflow engine)
Version control: every edit creates new version with diff capability
Notifications: expiry reminders at configurable intervals (90, 60, 30 days)
Attestation: campaigns target specific users/divisions, track completion rates
Scope enforcement: enterprise policies visible to all; tenant policies scoped to tenant
Audit: every status change, edit, approval, attestation generates audit event
Frontend Pages:

/dashboard/governance/policies — Policy directory with filters (category, status, scope)
/dashboard/governance/policies/new — Create policy form (rich text editor)
/dashboard/governance/policies/[id] — Policy detail with version timeline
/dashboard/governance/policies/[id]/edit — Edit policy
/dashboard/governance/policies/[id]/diff — Side-by-side version comparison
/dashboard/governance/policies/[id]/attestations — Attestation dashboard
2. RACI Matrix Management (FR-A008 to FR-A010) [MUST HAVE]
Database:


CREATE TABLE raci_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'process', 'project', 'service'
  entity_id UUID,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE raci_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES raci_matrices(id),
  activity TEXT NOT NULL,
  responsible_ids UUID[] NOT NULL, -- R
  accountable_id UUID NOT NULL,   -- A (exactly ONE)
  consulted_ids UUID[],           -- C
  informed_ids UUID[],            -- I
  notes TEXT
);
Validation Rule: Every raci_entry MUST have exactly one accountable_id (FR-A009)
API: CRUD for matrices + entries, coverage report showing unassigned responsibilities

3. Meetings, Decisions & Action Tracking (FR-A011 to FR-A015) [MUST HAVE]
Database:


CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  meeting_type TEXT, -- 'standing', 'ad_hoc', 'review', 'governance'
  agenda TEXT,
  minutes TEXT,
  location TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT,
  recurrence_rule TEXT, -- iCal RRULE format
  template_agenda TEXT,
  attendee_ids UUID[],
  organizer_id UUID NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meeting_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  tenant_id UUID NOT NULL,
  decision_number TEXT NOT NULL, -- e.g., "DEC-2026-001"
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  impact_assessment TEXT,
  decided_by_ids UUID[], -- Who voted/agreed
  status TEXT DEFAULT 'active', -- active, superseded, revoked
  evidence_refs UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_type TEXT NOT NULL, -- 'meeting', 'decision', 'audit', 'review'
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'open', -- open, in_progress, completed, overdue, cancelled
  completion_evidence TEXT,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
Features:

Meeting management with agenda, minutes, decisions, action items
Action item tracking with owner, due date, status, completion evidence
Overdue action dashboard with automated reminder notifications
Recurring meetings with template agendas (Could have)
Decision traceability: every decision linked to meeting + participants
4. OKR Cascade & Strategic Alignment (FR-A016 to FR-A022) [SHOULD HAVE]
Database:


CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  parent_id UUID REFERENCES okrs(id), -- Parent OKR for cascade
  level TEXT NOT NULL, -- 'department', 'division', 'office', 'unit'
  scope_id UUID, -- ID of the org unit
  objective TEXT NOT NULL,
  period TEXT NOT NULL, -- 'Q1-2026', 'H1-2026', 'FY2026'
  owner_id UUID NOT NULL,
  status TEXT DEFAULT 'draft',
  progress_pct DECIMAL(5,2) DEFAULT 0,
  scoring_method TEXT DEFAULT 'percentage', -- percentage, rag, numeric
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id),
  title TEXT NOT NULL,
  target_value DECIMAL,
  current_value DECIMAL DEFAULT 0,
  unit TEXT, -- '%', 'count', 'hours', 'score'
  status TEXT DEFAULT 'on_track', -- on_track, at_risk, behind, achieved
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT,
  target_value DECIMAL,
  warning_threshold DECIMAL,
  critical_threshold DECIMAL,
  current_value DECIMAL,
  unit TEXT,
  frequency TEXT DEFAULT 'monthly',
  owner_id UUID,
  last_updated_at TIMESTAMPTZ
);
Features:

OKR definition at all org levels (department → unit)
Parent-child cascade with alignment tracking
Progress tracking with configurable scoring (%, RAG, numeric)
KPI definition with threshold-based alerting
Org chart visualization (data from Graph API directory sync)
Audit trail for all governance actions (FR-A022)
5. Frontend — Governance Dashboard
Governance hub with widgets: active policies, overdue actions, OKR progress, upcoming meetings
Policy management UI (list, create, edit, diff viewer, attestation tracker)
RACI matrix builder (grid editor with user selection)
Meeting management (calendar view, minutes editor, decision/action trackers)
OKR tree view with cascade visualization and progress bars
Org chart component rendering from directory data
ALL OPERATIONS MUST:
Enforce tenant_id scoping
Check RBAC permissions (head_of_division can manage; staff can view)
Emit audit events for every state change
Use approval workflow engine for policy publication and OKR approval
Send notifications for reminders, overdue items, approvals needed


---

## PROMPT 4: Domain C — Work Planning, PMO & Execution Module

You are building Domain C (Work Planning & Execution) for ITD-OPMS. This module implements
capabilities C1-C18 covering portfolio management, project lifecycle, WBS/task management,
risk/issue registers, and delivery reporting. Requirements: FR-C001 through FR-C020.

CONTEXT
Foundation, Entra ID integration, and Governance module are operational. The workflow engine,
audit framework, and notification orchestrator are available as platform services.

YOUR TASK — Planning/PMO Module (Phase 2: Weeks 3-5)
1. Portfolio & Roadmap Management (FR-C001 to FR-C004) [MUST HAVE]
Database Entities:

portfolios (id, tenant_id, name, description, owner_id, fiscal_year, status, created_at)
projects (id, tenant_id, portfolio_id FK, title, code TEXT UNIQUE per tenant, description, charter TEXT, scope TEXT, business_case TEXT, sponsor_id, project_manager_id, status ENUM('proposed','approved','active','on_hold','completed','cancelled'), rag_status ENUM('green','amber','red'), priority, planned_start, planned_end, actual_start, actual_end, budget_approved DECIMAL, budget_spent DECIMAL, completion_pct, metadata JSONB)
project_dependencies (id, project_id FK, depends_on_project_id FK, dependency_type, description, impact_if_delayed TEXT)
project_stakeholders (id, project_id FK, user_id FK, role TEXT, influence TEXT, interest TEXT, communication_preference TEXT)
API Endpoints:

Full CRUD for portfolios and projects
POST /api/v1/planning/projects/:id/approve — Approval workflow for project initiation
GET /api/v1/planning/portfolios/:id/roadmap — Visual roadmap data (timeline + dependencies)
GET /api/v1/planning/portfolios/:id/analytics — Portfolio-level metrics
Dependency mapping with impact analysis
Frontend:

Portfolio roadmap page with Gantt-style timeline visualization (use recharts or custom SVG)
Project cards with RAG status, progress bars, key metrics
Project initiation wizard (charter, scope, stakeholders, approval)
Dependency graph visualization
2. Work Breakdown & Task Management (FR-C005 to FR-C010) [MUST HAVE]
Database:

work_items (id, tenant_id, project_id FK, parent_id FK self-ref, type ENUM('epic','story', 'task','subtask','milestone'), title, description, assignee_id, reporter_id, status ENUM('todo','in_progress','in_review','done','blocked'), priority ENUM('critical','high', 'medium','low'), estimated_hours DECIMAL, actual_hours DECIMAL, due_date, completed_at, sort_order INT, tags TEXT[], metadata JSONB)
milestones (id, tenant_id, project_id FK, title, description, target_date, actual_date, status, evidence_refs UUID[], completion_criteria TEXT)
time_entries (id, work_item_id FK, user_id FK, hours DECIMAL, description, logged_date DATE)
API Endpoints:

Full CRUD for work items with hierarchical queries
GET /api/v1/planning/projects/:id/wbs — Full WBS tree
PUT /api/v1/planning/work-items/:id/transition — Status transitions (configurable workflow)
GET /api/v1/planning/projects/:id/milestones — Milestone tracking with burn-down data
POST /api/v1/planning/work-items/:id/time-entries — Log effort
Business Logic:

Hierarchical WBS with parent-child decomposition
Configurable status workflow (To Do → In Progress → Review → Done)
Automatic progress calculation from child completion
Milestone burn-down computation
Effort tracking: actual vs. estimated comparison
Overdue task detection with notifications
Frontend:

Kanban board view (drag-drop columns for statuses) — reuse dnd-kit pattern from talent-portal
List/table view with filters (assignee, status, priority, due date)
Gantt/timeline view for project schedule (FR-C009) [SHOULD]
Milestone tracker with burn-down chart (Recharts)
WBS tree view with expand/collapse
Task detail slide-over panel
3. Risk, Issue & Change Management (FR-C011 to FR-C016) [MUST HAVE]
Database:

risk_register (id, tenant_id, project_id FK, title, description, category, likelihood ENUM('very_low','low','medium','high','very_high'), impact ENUM('very_low','low','medium','high','very_high'), risk_score INT GENERATED, status ENUM('identified','assessed','mitigating','accepted','closed'), mitigation_plan TEXT, contingency_plan TEXT, owner_id FK, review_date DATE)
issues (id, tenant_id, project_id FK, title, description, category, severity, status ENUM('open','investigating','resolved','closed'), assignee_id, resolution TEXT, escalation_level INT, escalated_to_id, due_date)
change_requests (id, tenant_id, project_id FK, title, description, justification, impact_assessment TEXT, status ENUM('submitted','under_review','approved','rejected','implemented'), requested_by, reviewed_by, approval_chain_id FK)
API: Full CRUD + risk scoring + escalation workflows + change request approval chains

Frontend:

Risk register with heat map visualization (likelihood × impact matrix)
Issue tracker with escalation timeline
Change request workflow UI with approval status
4. Reporting & Executive Packs (FR-C017 to FR-C020)
Features:

Auto-generated project status reports from tracked data (FR-C018) [MUST]
Portfolio analytics: on-time delivery %, resource utilization, risk trends (FR-C019) [SHOULD]
Benefits realization tracking (FR-C015) [COULD]
Post-Implementation Review templates (FR-C016) [SHOULD]
Frontend:

Project status report page (auto-generated, exportable as PDF)
Portfolio analytics dashboard with charts
Resource allocation heatmap showing team capacity vs. commitments
INTEGRATION POINTS
Use workflow engine for project approval and change request workflows
Emit events to notification orchestrator for task assignments, overdue items, milestone approaching
Link risks/issues to GRC module risk register (Domain G)
Audit every project state change, task transition, approval decision


---

## PROMPT 5: Domain D — IT Service Management (ITSM) Core Module

You are building Domain D (IT Service Management) for ITD-OPMS. This is the LARGEST module with
24 capabilities implementing ITIL 4-aligned service management. Requirements: FR-D001 through FR-D034.

CONTEXT
Foundation, Entra ID, Governance, and PMO modules are operational. The SLA engine, workflow engine,
and notification orchestrator are available as platform services.

YOUR TASK — ITSM Module (Phase 3: Weeks 6-8)
1. Service Catalog (FR-D001 to FR-D004) [MUST HAVE]
Database:

service_catalog_categories (id, tenant_id, name, description, icon, parent_id FK, sort_order)
service_catalog_items (id, tenant_id, category_id FK, name, description, fulfillment_workflow_id, approval_required BOOLEAN, approval_chain_config JSONB, sla_policy_id FK, form_schema JSONB — dynamic form fields definition, entitlement_roles TEXT[] — who can request, estimated_delivery TEXT, status ENUM('active','inactive','deprecated'), version INT, created_at)
Features:

Hierarchical service categories with icons
Dynamic form schemas (JSONB) for each catalog item — rendered as configurable forms
Entitlement-based visibility: users only see catalog items they're entitled to
SLA policy linkage per catalog item
Catalog versioning with change approval workflow
Frontend:

Service catalog browse page (card grid grouped by category)
Service request form (dynamically rendered from form_schema)
Admin: catalog item builder with drag-drop form designer
2. Incident Management (FR-D005 to FR-D012) [MUST HAVE — CRITICAL PATH]
Database:

tickets (id, tenant_id, ticket_number TEXT UNIQUE — auto-generated 'INC-000001',
type ENUM('incident','service_request','problem','change'),
category TEXT, subcategory TEXT,
title TEXT NOT NULL, description TEXT NOT NULL,
priority ENUM('P1_critical','P2_high','P3_medium','P4_low'),
urgency ENUM('critical','high','medium','low'),
impact ENUM('critical','high','medium','low'),
status ENUM('logged','classified','assigned','in_progress','pending_customer',
'pending_vendor','resolved','closed','cancelled'),
channel ENUM('portal','email','manual','api'), -- How ticket was created
reporter_id UUID NOT NULL,
assignee_id UUID,
team_queue_id UUID,
sla_policy_id UUID,
sla_response_target TIMESTAMPTZ,
sla_resolution_target TIMESTAMPTZ,
sla_response_met BOOLEAN,
sla_resolution_met BOOLEAN,
sla_paused_at TIMESTAMPTZ, -- For pending_customer pause
sla_paused_duration_minutes INT DEFAULT 0,
is_major_incident BOOLEAN DEFAULT false,
related_ticket_ids UUID[],
linked_problem_id UUID,
linked_asset_ids UUID[], -- CMDB link
resolution_notes TEXT,
resolved_at TIMESTAMPTZ,
closed_at TIMESTAMPTZ,
first_response_at TIMESTAMPTZ,
satisfaction_score INT, -- CSAT 1-5
tags TEXT[],
custom_fields JSONB,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

ticket_comments (id, ticket_id FK, author_id FK, content TEXT, is_internal BOOLEAN,
attachments UUID[], created_at)

ticket_status_history (id, ticket_id FK, from_status, to_status, changed_by FK,
reason TEXT, timestamp)

escalation_rules (id, tenant_id, name, trigger_type ENUM('sla_warning','sla_breach',
'priority','manual'), trigger_config JSONB, escalation_chain JSONB — ordered list of
escalatees, is_active)

API Endpoints:

POST /api/v1/itsm/tickets — Create ticket (incident or request)
GET /api/v1/itsm/tickets — List with advanced filtering (status, priority, assignee, SLA status, date range)
GET /api/v1/itsm/tickets/:id — Full ticket detail with comments, history, SLA timers
PUT /api/v1/itsm/tickets/:id — Update ticket
POST /api/v1/itsm/tickets/:id/transition — Status transition
POST /api/v1/itsm/tickets/:id/assign — Assign/reassign
POST /api/v1/itsm/tickets/:id/escalate — Manual escalation
POST /api/v1/itsm/tickets/:id/comments — Add comment (internal/public)
POST /api/v1/itsm/tickets/:id/major-incident — Declare major incident
POST /api/v1/itsm/tickets/:id/link — Link related tickets
GET /api/v1/itsm/tickets/my-queue — Current user's assigned tickets
GET /api/v1/itsm/tickets/team-queue/:teamId — Team queue view
Business Logic:

Auto-priority calculation from urgency × impact matrix (configurable per tenant)
SLA timer management:
Start on ticket creation
Pause when status = pending_customer (FR-D025)
Resume when customer responds
Warning notification at 80% threshold (FR-D026)
Breach notification at 100%
Multi-level escalation on breach (FR-D027)
Business hours calendar support (FR-D023) — SLA timers only count business hours
Auto-assignment rules: round-robin, skills-based, workload-based, affinity (FR-D031)
Major incident workflow (FR-D011): declare → communication plan → PIR within 5 days (FR-D012)
Related incident linking for pattern detection (FR-D010)
3. SLA Engine Integration (FR-D021 to FR-D027) [MUST HAVE]
Database:

sla_policies (id, tenant_id, name, description, priority_targets JSONB — {"P1": {"response_minutes": 15, "resolution_minutes": 240}, "P2": {...}}, business_hours_calendar_id FK, is_default BOOLEAN, is_active)
business_hours_calendars (id, tenant_id, name, timezone TEXT, schedule JSONB — {"monday": {"start": "08:00", "end": "17:00"}, ...}, holidays JSONB — [{"date": "2026-10-01", "name": "Independence Day"}])
sla_breach_log (id, ticket_id FK, breach_type ENUM('response','resolution'), breached_at TIMESTAMPTZ, target_was TIMESTAMPTZ, actual_duration_minutes INT)
SLA Timer Service (Background):

Runs every minute checking tickets approaching SLA thresholds
Emits itsm.sla.warning at 80% and itsm.sla.breached at 100%
Respects business hours calendar (skip nights, weekends, holidays)
Handles pause/resume for pending states
Logs all breaches to sla_breach_log for reporting
4. Service Request Fulfilment (FR-D013 to FR-D016)
Catalog-driven form submission
Configurable approval chains based on request type and value
Status tracking with estimated delivery dates
Requester notifications throughout lifecycle
5. Problem Management (FR-D017 to FR-D020)
Database:

problems (id, tenant_id, problem_number, title, description, root_cause, status ENUM('logged','investigating','root_cause_identified','known_error','resolved'), linked_incident_ids UUID[], workaround TEXT, permanent_fix TEXT, linked_change_id UUID, owner_id, created_at)
known_errors (id, problem_id FK, title, description, workaround, kb_article_id UUID, status, created_at)
6. Queue Management & Auto-Assignment (FR-D030, FR-D031)
Database:

support_queues (id, tenant_id, name, team_id, priority_filter, auto_assign_rule ENUM('round_robin','least_loaded','skills_based','manual'), is_active)
Implement auto-assignment algorithms
7. CSAT Surveys (FR-D028, FR-D029) [SHOULD HAVE]
Trigger survey 24h after ticket closure
1-5 star rating with optional comment
Aggregate scores per service, team, agent
8. ITSM Dashboard (FR-D032) [MUST HAVE]
Frontend Pages:

/dashboard/itsm — ITSM hub with real-time metrics (open tickets, SLA compliance %, backlog)
/dashboard/itsm/tickets — Ticket list with advanced filters and bulk actions
/dashboard/itsm/tickets/new — Create ticket (select type, fill form)
/dashboard/itsm/tickets/[id] — Ticket detail (timeline, comments, SLA timer, linked items)
/dashboard/itsm/my-queue — Personal queue with priority sorting
/dashboard/itsm/service-catalog — Browse and request services
/dashboard/itsm/sla-dashboard — SLA compliance charts per service/team/priority
/dashboard/itsm/problems — Problem management view
Key UI Components:

SLA countdown timer component (visual indicator: green → yellow → red)
Priority badge with P1-P4 color coding
Ticket timeline showing all status changes, comments, escalations
Impact-urgency matrix picker for priority classification
Queue management board (kanban-style)
PERFORMANCE REQUIREMENTS
Ticket list API must respond within 500ms for up to 500K records (NFR-002, NFR-008)
Use database indexes on (tenant_id, status), (tenant_id, assignee_id), (tenant_id, priority, status)
Implement cursor-based pagination for large result sets


---

## PROMPT 6: Domain E — Asset, Configuration & Inventory (CMDB) Module

You are building Domain E (Asset, Configuration & Inventory) for ITD-OPMS. This module implements
capabilities E1-E12 covering asset lifecycle management, CMDB with relationships, and license/warranty
tracking. Requirements: FR-E001 through FR-E012.

YOUR TASK — CMDB Module (Phase 4: Weeks 9-10)
1. Asset Lifecycle Management (FR-E001 to FR-E005) [MUST HAVE]
Database:

assets (id, tenant_id, asset_tag TEXT UNIQUE, type ENUM('hardware','software','virtual','cloud',
'network','peripheral'), category TEXT, name TEXT, description TEXT, manufacturer TEXT, model TEXT,
serial_number TEXT, status ENUM('procured','received','active','maintenance','retired','disposed'),
location TEXT, building TEXT, floor TEXT, room TEXT,
owner_id UUID, custodian_id UUID,
purchase_date DATE, purchase_cost DECIMAL, currency TEXT DEFAULT 'NGN',
classification TEXT, -- Per CBN asset classification taxonomy
attributes JSONB, -- Type-specific flexible attributes
tags TEXT[],
created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())

asset_lifecycle_events (id, asset_id FK, event_type ENUM('procured','received','deployed',
'transferred','maintenance_start','maintenance_end','retired','disposed'),
performed_by FK, details JSONB, evidence_document_id UUID, timestamp)

asset_disposals (id, asset_id FK, tenant_id, disposal_method ENUM('resale','donation',
'recycling','destruction'), reason TEXT, approved_by UUID, approval_chain_id UUID,
disposal_date DATE, disposal_certificate_doc_id UUID, -- Evidence vault link
witness_ids UUID[], data_wipe_confirmed BOOLEAN,
status ENUM('pending_approval','approved','completed','cancelled'))

2. CMDB & Relationships (FR-E006 to FR-E008)
Database:

cmdb_items (id, tenant_id, ci_type TEXT, name, status, asset_id UUID, attributes JSONB, version INT, updated_at)
cmdb_relationships (id, source_ci_id FK, target_ci_id FK, relationship_type ENUM('runs_on','depends_on','connected_to','managed_by','contains','uses'), description TEXT, is_active)
reconciliation_runs (id, tenant_id, source TEXT, started_at, completed_at, matches INT, discrepancies INT, new_items INT, report JSONB)
Features:

CI topology visualization (graph/network diagram)
Reconciliation engine: compare discovery data against CMDB records
Discrepancy reporting with remediation tracking
3. License, Warranty & Renewal (FR-E009 to FR-E012) [MUST HAVE]
Database:

licenses (id, tenant_id, software_name, vendor, license_type ENUM('perpetual','subscription', 'per_user','per_device','site'), total_entitlements INT, assigned_count INT, compliance_status ENUM('compliant','over_deployed','under_utilized'), expiry_date DATE, cost DECIMAL, renewal_contact TEXT)
license_assignments (id, license_id FK, user_id UUID, asset_id UUID, assigned_at)
warranties (id, asset_id FK, tenant_id, vendor, contract_number, coverage_type TEXT, start_date DATE, end_date DATE, cost DECIMAL, renewal_status ENUM('active','expiring_soon','expired','renewed'))
renewal_alerts (id, entity_type, entity_id, alert_date DATE, sent BOOLEAN)
Features:

License compliance tracking (assigned vs. entitled)
Warranty expiry tracking with configurable alerts (90, 60, 30 days) (FR-E011)
Asset reporting: inventory summaries, compliance status, aging analysis, cost allocation
4. Frontend
/dashboard/cmdb/assets — Asset directory with filters (type, status, location, owner)
/dashboard/cmdb/assets/new — Asset registration form (type-specific dynamic fields)
/dashboard/cmdb/assets/[id] — Asset detail with lifecycle timeline, relationships
/dashboard/cmdb/assets/[id]/dispose — Disposal workflow with evidence upload
/dashboard/cmdb/topology — CMDB topology graph visualization
/dashboard/cmdb/licenses — License compliance dashboard
/dashboard/cmdb/warranties — Warranty tracker with expiry calendar
/dashboard/cmdb/reconciliation — Reconciliation report viewer
/dashboard/cmdb/reports — Asset analytics dashboards
KEY REQUIREMENTS
Disposal MUST generate audit evidence with certificates stored in evidence vault (FR-E004)
Full chain-of-custody tracking for audit (BR-016)
Target ≥90% CMDB accuracy within 90 days of deployment (BR-006)
All operations tenant-scoped, RBAC-enforced, audit-logged


---

## PROMPT 7: Domain B — People, Workforce & Admin Module

You are building Domain B (People, Workforce & Admin) for ITD-OPMS. This module implements
capabilities B1-B14 covering skills/competency management, onboarding/offboarding, roster/leave/
capacity planning, and training tracking. Requirements: FR-B001 through FR-B016.

YOUR TASK — People & Workforce Module (Phase 2 + Post-MVP)
1. Skills & Competency Management (FR-B001 to FR-B004) [SHOULD HAVE]
Database:

skill_categories (id, name, description, parent_id)
skills (id, category_id FK, name, description)
user_skills (id, user_id FK, skill_id FK, proficiency_level ENUM('beginner','intermediate', 'advanced','expert'), certified BOOLEAN, certification_name TEXT, certification_expiry DATE, verified_by UUID, verified_at TIMESTAMPTZ)
role_skill_requirements (id, role_type TEXT, skill_id FK, required_level TEXT)
Features:

Skills inventory per user with proficiency levels
Skills search: find personnel with specific expertise (FR-B004)
Skills gap analysis: compare team capabilities vs role requirements (FR-B002)
Competency framework with skill levels per role type (FR-B003)
2. Onboarding & Offboarding (FR-B005 to FR-B008) [MUST HAVE]
Database:

checklist_templates (id, tenant_id, type ENUM('onboarding','offboarding'), role_type TEXT, name, tasks JSONB — [{title, description, assignee_role, due_days, required}])
checklists (id, template_id FK, tenant_id, user_id FK — the person being on/offboarded, type, status ENUM('pending','in_progress','completed','cancelled'), completion_pct DECIMAL, started_at, completed_at)
checklist_tasks (id, checklist_id FK, title, description, assignee_id FK, status ENUM('pending','in_progress','completed','skipped'), due_date DATE, completed_at, completed_by, evidence_doc_id UUID, notes TEXT)
Features:

Configurable checklist templates per role type
Progress tracking with percentage and overdue alerts (FR-B006)
Offboarding: system access revocation tracking, knowledge transfer verification (FR-B007)
Completion certificates stored in evidence vault for audit (FR-B008)
3. Roster, Leave & Capacity (FR-B009 to FR-B012) [SHOULD HAVE]
Database:

rosters (id, tenant_id, team_id, name, period_start, period_end, status, shifts JSONB)
leave_records (id, user_id FK, tenant_id, leave_type, start_date, end_date, status ENUM('pending','approved','rejected','cancelled'), approved_by, notes)
capacity_allocations (id, user_id FK, project_id UUID, allocation_pct DECIMAL, period_start DATE, period_end DATE)
Features:

Roster management for shift-based teams
Leave tracking with capacity impact visibility
Capacity planning: available vs allocated hours per team member
Workload balance reporting (over/under-utilization)
4. Training & Development (FR-B013 to FR-B016) [SHOULD HAVE]
Database:

training_records (id, user_id FK, tenant_id, title, provider, type ENUM('course', 'certification','workshop','conference'), status, completed_at, expiry_date, certificate_doc_id UUID, cost DECIMAL)
Features:

Training & certification tracking with expiry dates
Certification expiry alerts at 90/60/30 days (FR-B014)
Workforce analytics dashboard: skills distribution, training completion rates, capacity trends
5. Frontend
/dashboard/people/skills — Skills directory with search
/dashboard/people/onboarding — Active onboarding checklists
/dashboard/people/offboarding — Active offboarding checklists
/dashboard/people/roster — Team roster/schedule view
/dashboard/people/capacity — Capacity planning dashboard
/dashboard/people/training — Training records and certification tracker
/dashboard/people/analytics — Workforce analytics dashboard
INTEGRATION
User data sourced from Entra ID directory sync (no local user creation)
Skills data can be linked to ITSM queue assignment rules (skills-based routing)
Capacity data feeds into PMO resource allocation conflict detection
All checklist completions generate audit evidence


---

## PROMPT 8: Domain F — Collaboration, Knowledge Management & Domain G — GRC/Audit Module

You are building Domain F (Collaboration & Knowledge) and Domain G (GRC & Audit Readiness) for
ITD-OPMS. These are the final two functional domains. Requirements: FR-F001-F010 and FR-G001-G014.

YOUR TASK — Knowledge + GRC Modules (Phases 5: Weeks 11-12)
PART A: Knowledge Management (Domain F)
1. Knowledge Base (FR-F001 to FR-F005)
Database:

kb_categories (id, tenant_id, name, description, parent_id, icon, sort_order)
kb_articles (id, tenant_id, category_id FK, title, slug TEXT UNIQUE, content TEXT — Markdown, status ENUM('draft','in_review','published','archived','retired'), version INT, type ENUM('how_to','troubleshooting','faq','best_practice','runbook'), tags TEXT[], author_id FK, reviewer_id, published_at, view_count INT DEFAULT 0, helpful_count INT DEFAULT 0, not_helpful_count INT DEFAULT 0, linked_ticket_ids UUID[], -- Articles linked from tickets created_at, updated_at)
kb_article_versions (id, article_id FK, version INT, content TEXT, changed_by, created_at)
kb_article_feedback (id, article_id FK, user_id FK, is_helpful BOOLEAN, comment TEXT, created_at)
Features:

Article lifecycle: Draft → Review → Published → Archived → Retired (FR-F002)
Templates for common types (how-to, troubleshooting, FAQ) (FR-F003)
Usage metrics: views, helpful votes, linked tickets (FR-F004)
KB search integrated into service request portal (FR-F005)
Full-text search across all articles (FR-F007)
2. Workspaces & Communications (FR-F006 to FR-F010)
Tenant-scoped workspaces for team collaboration (FR-F006)
Global search across all modules: tickets, assets, articles, projects, policies (FR-F007)
Announcement management with targeted distribution (FR-F008)
Document management with versioning and access control (FR-F009)
Knowledge analytics dashboard (FR-F010)
PART B: GRC & Audit Readiness (Domain G)
1. Risk Management (FR-G001 to FR-G004) [MUST HAVE]
Database:

risks (id, tenant_id, risk_number TEXT, title, description, category, likelihood ENUM('very_low','low','medium','high','very_high'), impact ENUM('very_low','low','medium','high','very_high'), risk_score INT GENERATED ALWAYS AS ( CASE likelihood WHEN 'very_low' THEN 1 ... END * CASE impact WHEN 'very_low' THEN 1 ... END ), status ENUM('identified','assessed','mitigating','accepted','closed','escalated'), treatment_plan TEXT, contingency_plan TEXT, owner_id FK, reviewer_id FK, review_date DATE, next_review_date DATE, linked_project_id UUID, linked_audit_id UUID, escalation_threshold INT, -- Auto-escalate when score exceeds this created_at, updated_at)
risk_assessments (id, risk_id FK, assessed_by FK, assessment_date, previous_likelihood, previous_impact, new_likelihood, new_impact, rationale TEXT, evidence_refs UUID[])
Features:

Risk register with likelihood × impact scoring
Configurable risk assessment matrices with heat map visualization (FR-G002)
Risk monitoring with review scheduling and owner accountability (FR-G003)
Auto-escalation when ratings exceed thresholds (FR-G004)
Integration with PMO risk register (Domain C)
2. Audit Preparation & Evidence (FR-G005 to FR-G008) [MUST HAVE — CRITICAL]
Database:

audits (id, tenant_id, title, audit_type ENUM('internal','external','regulatory'), scope TEXT, auditor TEXT, audit_body TEXT, status ENUM('planned','preparing','in_progress','findings_review','completed'), scheduled_start DATE, scheduled_end DATE, evidence_requirements JSONB, -- What evidence is needed readiness_score DECIMAL(5,2), -- Calculated from evidence completeness created_by, created_at)
audit_findings (id, audit_id FK, finding_number TEXT, title, description, severity, status ENUM('open','remediation_planned','in_remediation','closed','accepted'), remediation_plan TEXT, owner_id FK, due_date, closed_at, evidence_of_remediation UUID[])
evidence_collections (id, audit_id FK, tenant_id, title, description, status ENUM('pending','collecting','review','approved','submitted'), evidence_item_ids UUID[], -- Links to evidence_items table collector_id FK, reviewer_id FK, approved_at, checksum TEXT -- SHA-256 of the collection package)
Features:

Audit preparation management with scope, timeline, evidence requirements (FR-G005)
Automated evidence collection workflows (FR-G006):
Collect audit events by entity/date range
Collect approval chains and signoff records
Collect SLA compliance reports
Collect access review results
Package into downloadable evidence pack
Evidence vault with immutable storage and cryptographic checksums (FR-G007)
Audit readiness scoring based on evidence completeness (FR-G008)
Target: evidence pack assembled within 4 hours of request (BR-002, BR-009)
3. Access Reviews & Compliance (FR-G009 to FR-G014) [MUST HAVE]
Database:

access_review_campaigns (id, tenant_id, title, scope TEXT, status ENUM('planned','active','review','completed'), reviewer_ids UUID[], -- Managers reviewing access due_date DATE, completion_rate DECIMAL, created_by, created_at)
access_review_entries (id, campaign_id FK, user_id FK, role_id FK, reviewer_id FK, decision ENUM('approved','revoked','exception'), justification TEXT, exception_expiry DATE, decided_at)
compliance_controls (id, tenant_id, framework TEXT — 'ISO27001', 'COBIT', 'CBN_ITSP', control_id TEXT, control_name TEXT, description TEXT, implementation_status ENUM('not_started','partial','implemented','verified'), evidence_refs UUID[], owner_id FK, last_assessed_at)
Features:

Periodic access review campaigns with manager attestation (FR-G009)
Exception handling with justification and time-bound grants (FR-G010)
Compliance control mapping to regulatory frameworks (FR-G011)
Compliance dashboards: control effectiveness, attestation rates, remediation status (FR-G012)
Policy attestation tracking integration with Governance module (FR-G013)
GRC reports: risk trends, audit findings aging, compliance posture (FR-G014)
Frontend Pages
Knowledge:

/dashboard/knowledge — KB home with categories and search
/dashboard/knowledge/articles/new — Create article with Markdown editor
/dashboard/knowledge/articles/[slug] — Article view with feedback
/dashboard/knowledge/search — Global search results
GRC:

/dashboard/grc/risks — Risk register with heat map
/dashboard/grc/risks/[id] — Risk detail with assessment history
/dashboard/grc/audits — Audit preparation tracker
/dashboard/grc/audits/[id] — Audit detail with evidence collection status
/dashboard/grc/audits/[id]/evidence — Evidence collection workflow
/dashboard/grc/access-reviews — Access review campaigns
/dashboard/grc/compliance — Compliance dashboard with control mapping
/dashboard/grc/reports — GRC analytics and reporting


---

## PROMPT 9: Cross-Cutting — Dashboards, Executive Reporting, Analytics & Global Search

You are building the cross-cutting reporting, dashboards, and analytics layer for ITD-OPMS. This
ties together all 7 domains into unified executive visibility. Requirements: BR-004, BR-013,
FR-C018-C019, FR-D032, NFR-004, and the Solution Architecture's reporting module specification.

YOUR TASK — Reporting & Analytics Module
1. Executive Dashboard (BR-004) [MUST HAVE]
The ITD Director and Heads of Division need real-time visibility across all operations.

Dashboard API Endpoints:

GET /api/v1/dashboards/executive — Aggregated KPIs across all domains:
Governance: active policies, overdue actions, OKR progress, pending attestations
ITSM: open tickets by priority, SLA compliance %, MTTR, MTTA, backlog aging
PMO: portfolio RAG status, on-time delivery %, milestone burn-down
CMDB: asset count by type/status, license compliance %, warranty expiring soon
GRC: risk exposure (high/critical risks), audit readiness score, access review completion
People: team capacity utilization, overdue training/certifications
GET /api/v1/dashboards/tenant/:tenantId — Tenant-scoped version of above
GET /api/v1/dashboards/my — Role-specific personal dashboard data
Performance: Dashboard MUST load within 5 seconds (NFR-004).
Implementation:

Use materialized views or cached aggregations (Redis) for complex calculations
Background job refreshes aggregations every 5 minutes
Real-time counters for critical metrics (open P1 incidents, SLA breaches)
2. Executive Pack Generator (BR-013) [SHOULD HAVE]
Auto-generate monthly executive performance packs:

Features:

Configurable report templates with sections per domain
Auto-populated from system data (no manual compilation)
Sections: SLA performance, project status, risk posture, audit readiness, workforce metrics
Export as PDF with CBN branding (headers, logos, formatting)
Schedule: auto-generate on 1st of each month
Distribution: send via email to configured recipients
Database:

report_definitions (id, tenant_id, name, type ENUM('executive_pack','sla_report', 'asset_report','grc_report','custom'), template JSONB, schedule_cron TEXT, recipients UUID[], is_active, created_by)
report_runs (id, definition_id FK, generated_at, status, document_id UUID — stored in MinIO, data_snapshot JSONB)
3. Domain-Specific Dashboards
ITSM Dashboard (FR-D032):

Ticket volumes by priority/status (bar chart)
SLA compliance trend (line chart over time)
Backlog aging distribution (histogram)
Team performance: tickets resolved/day, MTTR per agent
Major incident timeline
PMO Dashboard (FR-C019):

Portfolio overview: projects by RAG status (donut chart)
On-time delivery percentage (gauge)
Resource utilization heatmap
Risk exposure trends (area chart)
Milestone completion vs. target
CMDB Dashboard:

Asset inventory by type/status (stacked bar)
License compliance status (gauge: compliant vs over-deployed)
Warranty expiry calendar (upcoming 90 days)
CMDB accuracy score (reconciliation results)
GRC Dashboard:

Risk heat map (likelihood × impact matrix with risk counts)
Audit readiness gauge per audit
Access review completion rates
Compliance control implementation status
4. Global Search (FR-F007, NFR-005) [SHOULD HAVE]
Unified search across all platform entities:

Implementation:

GET /api/v1/search?q=keyword&types=tickets,assets,articles,projects,policies&tenant_id=...
Search across: tickets, assets, KB articles, projects, policies, users, meetings, decisions
Results grouped by entity type with relevance scoring
Tenant-scoped: users only see search results within their scope
Performance: results within 2 seconds (NFR-005)
Implementation options:
PostgreSQL full-text search (tsvector/tsquery) for MVP
Upgrade to Elasticsearch/MeiliSearch post-MVP if needed
Frontend:

Command palette (Cmd+K) with instant search across all entities
Global search page with tabbed results by entity type
Search suggestions and recent searches
5. Data Export & Reporting
All list views support CSV/Excel export (SR-020 for audit logs)
Report builder: select entity type, filters, columns → generate report
Scheduled reports with email delivery
6. Frontend Pages
/dashboard — Role-aware dashboard (executive for Director, operational for staff)
/dashboard/reports — Report library with generation/scheduling
/dashboard/search — Global search results
All dashboards use Recharts for charts (reuse from talent-portal pattern)
Responsive design: all dashboards work on desktop (Chrome, Edge, Firefox) (NFR-016)
PERFORMANCE OPTIMIZATION
Implement dashboard data caching with Redis (TTL: 5 minutes for aggregations)
Use database materialized views for complex cross-module aggregations
Background refresh jobs via NATS-triggered workers
Lazy loading for heavy chart components
Skeleton loading states during data fetch (reuse LoadingSkeleton from talent-portal)


---

## PROMPT 10: Platform Hardening — Security, NFRs, Testing, DevOps & Production Readiness

You are performing the final hardening and production readiness work for ITD-OPMS. This covers all
non-functional requirements (NFR-001 to NFR-027), security requirements (SR-001 to SR-020),
data requirements (DRA-001 to DRA-012), infrastructure requirements (INR-001 to INR-013), and the
stabilization phase (Phase 6: Weeks 13-14).

YOUR TASK — Security Hardening, Testing, DevOps & Production Readiness
1. Security Hardening (SR-001 to SR-020)
Authentication Hardening:

Verify NO user credentials stored in platform database (SR-001)
Enforce 30-minute session timeout with secure termination (SR-002)
Implement session revocation on Entra ID security events (SR-003)
Verify OIDC/PKCE flow has no token leakage (check browser history, referrer headers)
Authorization Hardening:

Verify all 7 roles properly mapped to Entra ID groups (SR-004)
Test ABAC scope enforcement: no cross-tenant data leakage (SR-005, SR-006)
Verify delegation system: time-bound, approved, auto-expires (SR-007)
Log ALL authorization decisions (grant AND deny) to audit trail (SR-008)
Implement authorization test suite: attempt cross-tenant access, role escalation, etc.
Data Protection:

TLS 1.2+ on ALL connections (SR-009) — configure in nginx-proxy
AES-256 encryption at rest for PostgreSQL (SR-010) — LUKS volume encryption
MinIO server-side encryption (SSE) for evidence vault (SR-010)
Docker secrets for all application secrets — NO secrets in code/config (SR-011)
CSRF protection on all mutation endpoints (SR-012)
Security headers on ALL responses (SR-013):
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Rate limiting per tenant AND per user (SR-014) — implement in Go middleware + Redis
Sensitive field masking in API responses based on role (SR-015)
Audit System Verification:

Every state-changing operation generates immutable audit event (SR-016)
Verify audit_events table has NO UPDATE/DELETE permissions (SR-017)
Verify SHA-256 checksums present and verifiable on all events (SR-018)
Configure 7-year retention policy (SR-019)
Implement audit log export in CSV/JSON (SR-020)
2. Performance Optimization (NFR-001 to NFR-008)
Benchmarks to Meet:

Page load p95 ≤ 3 seconds (NFR-001)
API CRUD p95 ≤ 500ms (NFR-002)
Complex query/report API p95 ≤ 2 seconds (NFR-003)
Dashboard render ≤ 5 seconds (NFR-004)
Search results ≤ 2 seconds (NFR-005)
Batch operations ≤ 5 minutes (NFR-006)
Support 200 concurrent users (NFR-007)
500K records per table without degradation (NFR-008)
Optimization Actions:

Database indexes: audit all queries, add composite indexes where needed
Connection pooling: configure pgbouncer or built-in Go connection pool (max 50 connections)
Redis caching strategy: cache dashboard aggregations, user profiles, permission lookups
Query optimization: EXPLAIN ANALYZE on all list/search queries, fix N+1 patterns
Frontend: lazy loading, code splitting, image optimization, skeleton loaders
Load testing: use k6 or vegeta to simulate 200 concurrent users hitting all endpoints
Generate performance benchmark report with p50/p95/p99 latencies
3. Data Quality & Integrity (DRA-001 to DRA-012)
Verification:

All tenant-scoped tables have tenant_id column (DRA-001)
PostgreSQL RLS policies created and tested (DRA-002)
JSONB columns used for flexible attributes (DRA-003)
Migrations version-controlled and repeatable (DRA-004)
Foreign key constraints enforced (DRA-005)
Input validation on all API endpoints (DRA-006)
Idempotency keys on mutation endpoints (DRA-007)
created_at, updated_at, created_by, updated_by on all records (DRA-008)
Data classification applied automatically (DRA-009)
Retention tags present (DRA-010)
7-year retention for audit evidence (DRA-011)
Disposal evidence generation (DRA-012)
4. Observability & Monitoring Setup
Prometheus Metrics (expose on /metrics):

HTTP request rate, latency histogram (by endpoint, method, status)
Database query duration, connection pool utilization
Redis hit/miss ratio, connection count
NATS message publish/consume rates, DLQ depth
SLA engine: breaches/day, warnings/day
Business metrics: tickets created/day, tickets resolved/day
Grafana Dashboards:

Platform Health: container status, CPU/memory, error rates, latencies
SLA Compliance: real-time tracking, breach rates, per-tenant breakdown
API Performance: request rates, p50/p95/p99, error rates by endpoint
Database Performance: query latencies, connection pool, replication lag, disk
Integration Health: Graph API success rates, DLQ depth
Security: auth failures, rate limit triggers, unusual patterns
Loki Logging:

Structured JSON logging from Go API (level, timestamp, correlation_id, tenant_id, user_id, message)
Log levels: ERROR → alert, WARN → monitor, INFO → operational, DEBUG → dev only
30-day hot retention, 1-year archive
Tempo Tracing:

OpenTelemetry instrumentation on all API endpoints
Trace propagation through NATS consumers
14-day hot retention
Alerting (Prometheus Alertmanager → Teams + Email):

Critical: API down, database unreachable, security breach → 15min response
High: SLA engine degraded, integration failure → 1hr response
Medium: disk space warning, high error rate → 4hr response
Low: certificate expiring, backup growth → next business day
5. Docker Compose Production Configuration
docker-compose.prod.yml:

All services with resource limits (CPU, memory)
Health checks with restart policies
Network isolation: frontend, backend, monitoring
Volume mounts with proper permissions
Environment variable injection via Docker secrets
Log driver configuration (json-file with rotation)
Backup volume mounts for PostgreSQL WAL archiving
6. Disaster Recovery Setup (NFR-012 to NFR-015)
Implement:

PostgreSQL WAL archiving to DR site (RPO ≤ 15 minutes) (NFR-013)
Automated daily full backups with 30-day retention (NFR-012)
DR environment as warm standby with pre-configured containers
Failover script for DR activation (RTO ≤ 4 hours) (NFR-014)
Document and execute quarterly DR drill (NFR-015)
Store DR drill evidence in evidence vault
7. Testing Strategy
Unit Tests:

Go: test all service layer functions with table-driven tests
Frontend: test React components with React Testing Library
Target: >80% coverage on business logic
Integration Tests:

API endpoint tests with test database (PostgreSQL in Docker)
Test tenant isolation: create tickets in tenant A, verify invisible from tenant B
Test RBAC: attempt operations with insufficient permissions
Test SLA engine: create ticket, advance time, verify breach detection
Test audit trail: verify every mutation generates audit event
E2E Tests (Playwright):

Login flow (OIDC/PKCE with mock Entra ID)
Create and track ticket through full lifecycle
Submit service request through catalog
Create policy through approval workflow
Register asset through disposal
Execute access review campaign
Generate executive report
Security Tests:

OWASP Top 10 verification (XSS, SQL injection, CSRF, etc.)
Authorization bypass attempts
Cross-tenant data access attempts
Rate limiting verification
Token manipulation attempts
8. Documentation & Runbooks
Create:

API documentation (OpenAPI 3.0 spec auto-generated)
Deployment runbook: step-by-step production deployment
Backup/restore runbook: daily backup procedure + restore verification
Incident response runbook: platform-level incidents
DR failover runbook: step-by-step failover procedure
Configuration guide: how to configure workflows, SLAs, catalog items
User guide: per-role usage documentation
9. Accessibility & Usability (NFR-016 to NFR-021)
Verify responsive design on Chrome, Edge, Firefox (NFR-016)
Role-aware navigation correctly hides/shows modules (NFR-017)
Add contextual help and tooltips on complex forms (NFR-018)
WCAG 2.1 Level AA compliance audit (NFR-021)
Usability test: new user submits service request within 5 minutes (NFR-020)
DELIVERABLES
Security audit report with all SR requirements verified
Performance benchmark report with all NFR metrics
Test coverage report
Deployment runbooks
Monitoring dashboards (Grafana JSON exports)
DR drill evidence


---

Now let me save this to a file for easy reference.
Write AI_AGENT_PROMPTS.md
372 lines
# ITD-OPMS: 10 AI Agent Prompts for End-to-End Implementation

> **System**: ITD-AMD Operations & Performance Management System (ITD-OPMS)
> **Organization**: Central Bank of Nigeria — Information Technology Department
> **Architecture**: TOGAF 10 Aligned | 7 Domains | 100 Capabilities | 280+ Requirements
> **Baseline Reference**: talent-api (NestJS) + talent-portal (Next.js 16)
> **Target Stack**: Go modular monolith + Next.js 16 + PostgreSQL + MinIO + NATS + Redis

---

## Prompt Sequence & Phase Mapping

| # | Prompt | Phase | Weeks | Domains/Requirements |
|---|--------|-------|-------|---------------------|
| 1 | Foundation — Scaffolding, Multi-Tenant DB, Audit Framework | Foundation | 1–2 | Platform Core, BR-001 to BR-010 |
| 2 | Microsoft 365 Integration — Entra ID SSO, Graph API, Notifications | Foundation | 1–2 | IR-001 to IR-012 |
| 3 | Division Governance & Organisation | Governance+PMO | 3–5 | Domain A: FR-A001 to FR-A022 |
| 4 | Work Planning, PMO & Execution | Governance+PMO | 3–5 | Domain C: FR-C001 to FR-C020 |
| 5 | IT Service Management (ITSM) Core | ITSM Core | 6–8 | Domain D: FR-D001 to FR-D034 |
| 6 | Asset, Configuration & Inventory (CMDB) | CMDB+Evidence | 9–10 | Domain E: FR-E001 to FR-E012 |
| 7 | People, Workforce & Admin | Governance+PMO + Post-MVP | 3–5+ | Domain B: FR-B001 to FR-B016 |
| 8 | Knowledge Management + GRC/Audit Readiness | GRC+Reporting | 11–12 | Domain F: FR-F001-F010, Domain G: FR-G001-G014 |
| 9 | Dashboards, Executive Reporting, Analytics & Search | Cross-Cutting | All | BR-004, BR-013, NFR-004-005 |
| 10 | Security, NFRs, Testing, DevOps & Production Readiness | Stabilisation | 13–14 | NFR-001-027, SR-001-020, DRA-001-012, INR-001-013 |

---

## PROMPT 1: Foundation — Project Scaffolding, Multi-Tenant Data Architecture & Audit Event Framework

```
You are a senior full-stack engineer building ITD-OPMS (Operations & Performance Management System)
for the Central Bank of Nigeria's IT Department. This is a TOGAF 10-aligned, audit-ready, multi-tenant
enterprise platform with 7 capability domains and 100+ capabilities.

TECH STACK (MANDATORY — per Solution Architecture ADR decisions):
- Backend: Golang modular monolith with bounded contexts (NOT NestJS — migrating from TypeScript baseline to Go as mandated by CBN architecture standards ADR-001)
- Frontend: Next.js 16 + TypeScript + shadcn/ui + Tailwind CSS (reuse patterns from talent-portal)
- Database: PostgreSQL 16 with tenant_id on all scoped tables, JSONB for flexible attributes
- Object Storage: MinIO (S3-compatible) for evidence vault and attachments
- Event Bus: NATS JetStream for async domain events, notifications, and retry/DLQ
- Cache: Redis 7 for caching, rate limiting, background jobs
- Identity: Microsoft Entra ID via OIDC/PKCE (NO local credentials stored)
- Observability: OpenTelemetry → Prometheus + Grafana + Loki + Tempo
- Deployment: Docker Compose on Linux VMs

YOUR TASK — Phase 1: Foundation (Weeks 1-2)

1. Project Structure & Scaffolding
Create the Go backend project as a modular monolith:

itd-opms-api/
├── cmd/api/main.go
├── internal/
│   ├── platform/           (config, database, middleware, audit, auth, tenant, rbac, notification, workflow, sla, evidence, search, server)
│   ├── modules/            (governance, people, planning, itsm, cmdb, knowledge, grc, reporting)
│   └── shared/             (types, helpers, errors)
├── migrations/
├── docker-compose.yml
├── Dockerfile
└── Makefile

2. Database Foundation (Migrations 001-005)
- 001: tenants, org_units, org_hierarchy (closure table)
- 002: users (entra_id based), roles, role_bindings, delegations — seed 7 system roles
- 003: audit_events (APPEND-ONLY, SHA-256 checksums, NO UPDATE/DELETE)
- 004: approval_chains, approval_steps, signoffs
- 005: documents, evidence_items

3. Authentication & Tenant Resolution Middleware
- OIDC/PKCE with Entra ID, JWT validation, security group → role mapping
- Tenant resolution from claims + org_hierarchy, inject AuthContext

4. RBAC/ABAC Authorization Engine
- 7 roles, hybrid RBAC+ABAC, delegation support, audit all decisions

5. Audit Event Framework
- Immutable append-only, SHA-256 checksums, evidence_refs, query API

6. Docker Compose with all services (postgres, redis, minio, nats, grafana stack)

7. Frontend Foundation (Next.js shell)
- OIDC/PKCE login, httpOnly cookies, role-aware sidebar, CBN-branded theme
- Reuse patterns from talent-portal (DataTable, FormField, StatusBadge, etc.)

REFERENCE: Study talent-api and talent-portal codebases for patterns to adapt.
```

---

## PROMPT 2: Microsoft 365 Integration — Entra ID SSO, Graph API, Email & Teams Notifications

```
Build the Microsoft 365 integration layer for ITD-OPMS.

1. Entra ID OIDC Authentication (IR-001 to IR-005)
- Backend: JWT validation (issuer, audience, RS256/JWKS, expiry), group→role mapping, token refresh
- Frontend: OIDC/PKCE flow, httpOnly cookies, silent refresh, 30min timeout

2. Organizational Directory Sync (IR-006, IR-007)
- Delta sync from Graph API (/users with $deltatoken) every 15 minutes
- Map department→tenant, officeLocation→org unit, manager→hierarchy
- Reconciliation report, audit events for all changes

3. Email Notification Delivery (IR-008, IR-011, IR-012)
- Graph sendMail API with outbox pattern for reliability
- Template-driven (SLA breach, approval request, escalation, renewal, major incident)
- Retry with exponential backoff, DLQ for permanent failures
- Rate limit handling with batching

4. Teams Channel Notifications (IR-009, IR-010)
- Graph Teams API with Adaptive Cards (approve/reject buttons)
- Configurable channel mapping per tenant and notification type

5. Notification Orchestrator
- Listen to NATS domain events, resolve recipients, check preferences
- Route to email/Teams/in-app, support digest mode, DLQ monitoring

6. Frontend Notification Center
- Bell icon with badge, notification panel, preferences settings, real-time WebSocket
```

---

## PROMPT 3: Domain A — Division Governance & Organisation Module

```
Build Governance module (FR-A001 to FR-A022):

1. Policy Management (MUST): lifecycle (Draft→Review→Approve→Publish→Retire), version control
   with diff, approval workflows, attestation campaigns, scoped visibility, expiry notifications

2. RACI Matrix Management (MUST): create/maintain matrices, enforce single Accountable,
   coverage reports

3. Meetings & Decisions (MUST): meeting management with agenda/minutes, decision logging with
   rationale/attendees, action items with owner/due date/status/evidence, overdue dashboards

4. OKR Cascade (SHOULD): department→unit OKRs with parent-child alignment, configurable scoring,
   KPI definition with threshold alerts, org chart visualization

Frontend: Policy directory, RACI grid editor, meeting/decision tracker, OKR tree view,
governance dashboard
```

---

## PROMPT 4: Domain C — Work Planning, PMO & Execution Module

```
Build Planning/PMO module (FR-C001 to FR-C020):

1. Portfolio & Roadmap (MUST): portfolios with projects, Gantt timeline, dependencies, RAG status,
   project initiation with charter/scope/approval workflow

2. WBS & Task Management (MUST): hierarchical work items (epic→story→task→subtask),
   kanban board (drag-drop), milestone tracking with burn-down, effort tracking (actual vs estimated),
   configurable status workflow

3. Risk, Issue & Change (MUST): risk register (likelihood×impact scoring), issue tracker with
   escalation, change request management with approval chains

4. Reporting (MUST/SHOULD): auto-generated status reports, portfolio analytics, resource
   utilization heatmap, benefits realization tracking, PIR templates
```

---

## PROMPT 5: Domain D — IT Service Management (ITSM) Core Module

```
Build ITSM module (FR-D001 to FR-D034) — LARGEST module, ITIL 4-aligned:

1. Service Catalog (MUST): hierarchical categories, dynamic form schemas (JSONB),
   entitlement-based visibility, SLA policy linkage

2. Incident Management (MUST — CRITICAL): ticket lifecycle (Logged→Classified→Assigned→
   In Progress→Resolved→Closed), auto-priority from urgency×impact matrix, multi-channel
   creation, related incident linking, major incident with communication plan + PIR

3. SLA Engine (MUST): policy definition per priority, real-time countdown timers,
   business hours calendars with holidays, pause/resume for pending states,
   breach warnings at 80%/100%, multi-level escalation chains

4. Service Request Fulfilment (MUST): catalog-driven forms, configurable approval chains,
   status tracking with estimated delivery

5. Problem Management (MUST): problem records from incidents, RCA templates, known error
   database with workarounds linked to KB

6. Queue Management (MUST): configurable queues, auto-assignment (round-robin/skills/workload)

7. CSAT Surveys (SHOULD): trigger after closure, 1-5 rating, aggregate per service/team/agent

8. ITSM Dashboard (MUST): real-time metrics, SLA compliance charts, backlog aging, team performance

Performance: ticket list API ≤500ms at 500K records, cursor-based pagination
```

---

## PROMPT 6: Domain E — Asset, Configuration & Inventory (CMDB) Module

```
Build CMDB module (FR-E001 to FR-E012):

1. Asset Lifecycle (MUST): registration with type-specific attributes (JSONB), lifecycle
   (Procured→Received→Active→Maintenance→Retired→Disposed), tagging/location/owner tracking,
   disposal with approval workflow + certificate in evidence vault

2. CMDB & Relationships (MUST/SHOULD): CI types and attributes, relationship types
   (runs_on, depends_on, connected_to, managed_by), topology visualization,
   reconciliation engine with discrepancy reporting

3. License/Warranty/Renewal (MUST): license compliance (assigned vs entitled),
   warranty tracking, renewal alerts at 90/60/30 days, asset reporting

Target: ≥90% CMDB accuracy within 90 days (BR-006)
```

---

## PROMPT 7: Domain B — People, Workforce & Admin Module

```
Build People module (FR-B001 to FR-B016):

1. Skills & Competency (SHOULD): skills inventory per user, proficiency levels,
   skills search, gap analysis, competency framework

2. Onboarding/Offboarding (MUST): configurable checklist templates per role, progress
   tracking with overdue alerts, access revocation tracking, completion evidence for audit

3. Roster/Leave/Capacity (SHOULD): shift schedules, leave tracking with capacity impact,
   capacity planning (available vs allocated hours), workload balance reporting

4. Training & Development (SHOULD): training/certification tracking with expiry dates,
   expiry alerts (90/60/30 days), workforce analytics dashboard
```

---

## PROMPT 8: Domain F (Knowledge) + Domain G (GRC/Audit) Modules

```
Build Knowledge module (FR-F001-F010) and GRC module (FR-G001-G014):

KNOWLEDGE:
1. Knowledge Base: article lifecycle (Draft→Review→Published→Archived), Markdown editor,
   categorization/tagging, full-text search, templates per type, usage metrics,
   KB integration in service request portal

2. Workspaces & Search: team workspaces, global search across all modules,
   announcements, document management

GRC/AUDIT (CRITICAL for CBN):
1. Risk Management (MUST): risk register with likelihood×impact scoring, heat map,
   monitoring with review scheduling, auto-escalation on threshold breach

2. Audit Preparation (MUST): audit management with scope/timeline/evidence requirements,
   automated evidence collection workflows, evidence vault (immutable, SHA-256),
   audit readiness scoring — TARGET: evidence pack within 4 hours (BR-002)

3. Access Reviews (MUST): periodic campaigns with manager attestation, exception handling
   with justification/expiry, compliance control mapping to frameworks (ISO27001, COBIT)

4. Compliance dashboards, policy attestation integration, GRC reporting
```

---

## PROMPT 9: Cross-Cutting — Dashboards, Executive Reporting & Analytics

```
Build the reporting and analytics layer:

1. Executive Dashboard (MUST, BR-004): aggregated KPIs across all 7 domains,
   tenant-scoped views, role-specific personal dashboards, load ≤5 seconds (NFR-004)

2. Executive Pack Generator (SHOULD, BR-013): auto-generated monthly reports,
   PDF export with CBN branding, scheduled distribution via email

3. Domain Dashboards: ITSM (ticket volumes, SLA compliance, backlog), PMO (portfolio RAG,
   delivery %, milestones), CMDB (asset inventory, license compliance), GRC (risk heat map,
   audit readiness, access reviews)

4. Global Search (SHOULD, NFR-005): unified search across all entities,
   command palette (Cmd+K), results ≤2 seconds

5. Data Export: CSV/Excel export from all list views, report builder with scheduling

Implementation: Redis-cached aggregations (5min TTL), materialized views,
background refresh jobs, Recharts for charts, skeleton loading states
```

---

## PROMPT 10: Security, NFRs, Testing, DevOps & Production Readiness

```
Final hardening and production readiness:

1. SECURITY (SR-001 to SR-020): verify no stored credentials, session timeouts,
   RBAC/ABAC enforcement, tenant isolation, delegation security, TLS 1.2+, AES-256 at rest,
   Docker secrets, CSRF, security headers, rate limiting, field masking,
   immutable audit with checksums, 7-year retention

2. PERFORMANCE (NFR-001 to NFR-008): benchmark all endpoints (page ≤3s, API ≤500ms,
   dashboard ≤5s, search ≤2s), support 200 concurrent users, 500K records/table,
   database index optimization, connection pooling, Redis caching, load testing

3. DATA QUALITY (DRA-001 to DRA-012): tenant_id on all tables, RLS policies,
   FK constraints, input validation, idempotency, metadata columns, classification,
   retention tags, disposal evidence

4. OBSERVABILITY: Prometheus metrics (HTTP, DB, Redis, NATS, SLA, business),
   Grafana dashboards (6 key dashboards), Loki logging (structured JSON),
   Tempo tracing (OpenTelemetry), alerting (Critical→Low severity levels)

5. DOCKER COMPOSE PROD: resource limits, health checks, network isolation,
   secrets management, log rotation

6. DISASTER RECOVERY: WAL archiving (RPO ≤15min), daily backups (30-day retention),
   warm standby DR, failover script (RTO ≤4hrs), quarterly DR drills with evidence

7. TESTING: unit tests (>80% coverage), integration tests (tenant isolation, RBAC, SLA),
   E2E tests (Playwright: login, ticket lifecycle, policy workflow, asset disposal),
   security tests (OWASP Top 10, authz bypass, cross-tenant)

8. DOCUMENTATION: OpenAPI specs, deployment/backup/DR/incident runbooks,
   configuration guide, user guides per role

9. ACCESSIBILITY: responsive desktop (Chrome/Edge/Firefox), role-aware navigation,
   WCAG 2.1 AA compliance, usability testing
```

---

## Key Architecture Decisions Reflected in Prompts

| Decision | Rationale |
|----------|-----------|
| **Go backend** (not NestJS) | ADR-001: CBN mandated; high performance, small footprint |
| **Modular monolith** | ADR-002: Simple deployment, single DB transactions, can evolve to microservices |
| **PostgreSQL only** | ADR-003: Enterprise-grade, JSONB, RLS for tenant isolation |
| **Entra ID only** | ADR-004: CBN standard; no local credentials |
| **Docker Compose** | ADR-005: Simpler than K8s for initial scale; migration path exists |
| **Outbox pattern** | ADR-006: Guarantees no notification loss |
| **MinIO** | ADR-007: S3-compatible, on-premises, cloud-migratable |
| **NATS JetStream** | ADR-008: Lightweight, persistent, simpler than Kafka |
| **Next.js + shadcn/ui** | ADR-009/010: SSR, React ecosystem, accessible, CBN-brandable |

## Reuse from Existing Codebases

**From talent-api (adapt to Go):**
- Module structure (controller → service → repository → entity)
- Guard/middleware patterns (auth, roles, permissions, rate limiting)
- Base entity pattern (UUID PK, timestamps, soft delete)
- Response envelope pattern
- Audit logging pattern
- Notification patterns (outbox, templates, preferences)

**From talent-portal (reuse directly):**
- Auth provider pattern → adapt for OIDC/PKCE
- API client with token injection
- Role-aware sidebar navigation
- DataTable, FormField, StatusBadge, ConfirmDialog components
- React Query hooks pattern
- Animation variants (Framer Motion)
- Theme provider with dark mode
- Command palette (Cmd+K)
- Kanban board (dnd-kit)
Update Todos

Read remaining requirements document sections (Domains B-G, NFRs, Integration, Security, Data, Infra)

Read remaining architecture document sections (Tech stack, modules, data architecture, security, deployment)

Synthesize all information and generate 10 AI agent prompts
I've completed the deep study and generated all 10 prompts. Here's a summary of what was produced:

Summary
I thoroughly analyzed both documents (280+ requirements across 7 domains, 100 capabilities) and both codebases (talent-api: 16 NestJS modules, 32 entities, 100+ endpoints; talent-portal: Next.js 16 with 30+ pages, 25+ hooks, role-based dashboards).

The 10 AI Agent Prompts
#	Prompt	Phase	Coverage
1	Foundation — Scaffolding, Multi-Tenant DB, Audit Framework	Wk 1-2	Go monolith, PostgreSQL schema, RBAC/ABAC, audit events, Docker Compose, Next.js shell
2	M365 Integration — Entra ID SSO, Graph API, Notifications	Wk 1-2	OIDC/PKCE auth, directory sync, email/Teams delivery, outbox pattern, DLQ
3	Domain A: Governance — Policies, RACI, Meetings, OKRs	Wk 3-5	FR-A001→A022 (22 requirements)
4	Domain C: PMO — Portfolio, WBS, Risks, Reporting	Wk 3-5	FR-C001→C020 (20 requirements)
5	Domain D: ITSM — Service Catalog, Incidents, SLA, Problems	Wk 6-8	FR-D001→D034 (34 requirements) — largest module
6	Domain E: CMDB — Assets, CI Relationships, Licenses, Warranties	Wk 9-10	FR-E001→E012 (12 requirements)
7	Domain B: People — Skills, On/Offboarding, Roster, Training	Wk 3-5+	FR-B001→B016 (16 requirements)
8	Domains F+G: Knowledge + GRC — KB, Risks, Audits, Access Reviews	Wk 11-12	FR-F001→F010, FR-G001→G014 (24 requirements)
9	Dashboards & Analytics — Executive packs, search, reporting	All	Cross-cutting KPIs, global search, export
10	Production Hardening — Security, NFRs, testing, DevOps, DR	Wk 13-14	NFR-001→027, SR-001→020, DRA-001→012, INR-001→013
Key Design Decisions
Backend migrates from NestJS to Go (per CBN's ADR-001 mandate in the Solution Architecture)
Frontend reuses talent-portal patterns (Next.js 16, React Query, shadcn/ui, role-aware navigation)
Multi-tenant isolation via tenant_id on every table + RBAC/ABAC middleware
Audit-by-design: immutable append-only audit events with SHA-256 checksums
Outbox pattern for reliable notification delivery (no lost alerts)
The complete file has been saved to AI_AGENT_PROMPTS.md.
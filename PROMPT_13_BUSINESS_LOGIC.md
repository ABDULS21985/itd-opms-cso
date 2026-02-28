# PROMPT 13: Business Logic & Platform — Approval Workflows, Change Calendar, Resource Heatmap, Budget Tracking, Vendor Management, Document Vault, Workflow Automation & Custom Fields

> **Priority**: High (core business logic & platform extensibility)
> **Domains**: Cross-cutting — touches governance, ITSM, planning, CMDB, and platform layers
> **Estimated Files**: ~25 frontend + ~20 backend + ~4 migrations
> **Dependencies**: MinIO (already configured), NATS JetStream (already running), @dnd-kit (already installed)

---

## Context & Architecture

You are a senior full-stack engineer working on ITD-OPMS (Operations & Performance Management System) for the Central Bank of Nigeria's IT Department. The system is fully built across 10 modules with 106+ pages, 280+ TanStack Query hooks, and 200+ API endpoints.

**Tech Stack (already established — do NOT change):**
- Backend: Go modular monolith at `itd-opms-api/` (module: `github.com/itd-cbn/itd-opms-api`)
- Frontend: Next.js 16 + React 19 + TypeScript at `itd-opms-portal/`
- DB: PostgreSQL 16, pgx/v5 driver, goose/v3 migrations
- Router: chi/v5 with middleware chain
- UI: Tailwind 4, Framer Motion 12, Lucide icons, Recharts 2.15, Sonner toasts
- State: TanStack Query 5 for server state
- Auth: Dual-mode (Entra ID OIDC + dev JWT), RBAC with 7 roles
- File Storage: MinIO S3 with `minio-go/v7` — buckets: `evidence-vault`, `attachments`
- Messaging: NATS JetStream for domain events — subjects: `notify.itsm.>`, `notify.governance.>`, `notify.cmdb.>`, `notify.grc.>`
- Cache: Redis via `go-redis/v9`
- Forms: react-hook-form 7 + zod 4 + @hookform/resolvers 5
- CSS Variables: `var(--primary)`, `var(--surface-0)`, `var(--surface-1)`, `var(--surface-2)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--neutral-gray)`, `var(--error)`, `var(--secondary)`

**Critical Patterns (follow exactly):**
- Response envelope: `types.OK(w, data, meta)`, `types.ErrorMessage(w, status, code, msg)`
- Pagination: `types.ParsePagination(r)` → page, limit; `types.NewMeta(total, pagination)`
- Auth context: `types.GetAuthContext(r.Context())` → `auth.UserID`, `auth.TenantID`, `auth.Roles`
- Middleware: `middleware.RequirePermission("itsm.manage")` per-route
- Frontend hooks: TanStack Query `useQuery`/`useMutation` with `apiClient.get`/`apiClient.post`/etc. from `@/lib/api-client`
- Toast: `toast.success("...")`, `toast.error("...")`
- Query invalidation: `queryClient.invalidateQueries({ queryKey: [...] })` on mutation success
- MinIO path pattern: `tenants/{tenantID}/{module}/{entityID}/{filename}`
- NATS publishing: `js.Publish("notify.{module}.{event}", payload)`
- Audit logging: `auditSvc.Log(ctx, tenantID, actorID, action, entityType, entityID, details)`
- NO shadcn/ui — project uses plain JSX + Tailwind + Framer Motion. No @radix-ui.

---

## EXISTING INFRASTRUCTURE (Read carefully — you're building ON TOP of this)

### Approval Tables (Migration 004 — already exist, underutilized)

```sql
-- workflow_definitions: Configurable approval templates
CREATE TABLE workflow_definitions (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    description     TEXT,
    entity_type     TEXT NOT NULL,  -- 'policy', 'change_request', 'disposal', etc.
    steps           JSONB NOT NULL DEFAULT '[]',  -- ordered step definitions
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ, updated_at TIMESTAMPTZ
);

-- approval_chains: Instances of a workflow execution
CREATE TABLE approval_chains (
    id                      UUID PRIMARY KEY,
    entity_type             TEXT NOT NULL,
    entity_id               UUID NOT NULL,
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    workflow_definition_id  UUID REFERENCES workflow_definitions(id),
    status                  approval_status NOT NULL DEFAULT 'pending',  -- pending|in_progress|approved|rejected|cancelled
    current_step            INT NOT NULL DEFAULT 1,
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ, completed_at TIMESTAMPTZ
);

-- approval_steps: Individual approver decisions
CREATE TABLE approval_steps (
    id              UUID PRIMARY KEY,
    chain_id        UUID NOT NULL REFERENCES approval_chains(id),
    step_order      INT NOT NULL,
    approver_id     UUID NOT NULL REFERENCES users(id),
    decision        approval_decision NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|skipped
    comments        TEXT,
    decided_at      TIMESTAMPTZ,
    evidence_refs   UUID[] DEFAULT '{}',
    delegated_from  UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ
);

-- signoffs: Formal sign-off records
CREATE TABLE signoffs (
    id UUID PRIMARY KEY, entity_type TEXT, entity_id UUID, tenant_id UUID,
    signer_id UUID, signer_role TEXT, signed_at TIMESTAMPTZ, comments TEXT, checksum TEXT
);
```

**Current usage**: Only referenced via `approval_chain_id` FK in `change_requests` and `asset_disposals` tables. **No Go handlers, services, or SQL queries exist** for these tables. No frontend UI exists.

### Document Storage (Migration 005 + MinIO)

```sql
-- documents: MinIO-stored files with metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY, tenant_id UUID, title TEXT, description TEXT,
    file_key TEXT NOT NULL,  -- MinIO object path
    content_type TEXT NOT NULL, size_bytes BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    classification document_classification NOT NULL,  -- audit_evidence|operational|configuration|policy|report|transient
    retention_until TIMESTAMPTZ, tags TEXT[],
    uploaded_by UUID REFERENCES users(id), created_at TIMESTAMPTZ
);

-- evidence_items: Links entities to documents (polymorphic)
CREATE TABLE evidence_items (
    id UUID PRIMARY KEY, tenant_id UUID, entity_type TEXT, entity_id UUID,
    document_id UUID REFERENCES documents(id),
    description TEXT, collected_by UUID, collected_at TIMESTAMPTZ, is_immutable BOOLEAN
);
```

**Existing upload service** at `itd-opms-api/internal/modules/planning/document_service.go`:
- `DocumentService` with MinIO client, pgxpool, audit service
- `UploadDocument()` — multipart upload, SHA-256 checksums, 50MB limit, atomic DB+MinIO transactions
- `ListDocuments()` — paginated with category/status/search filters
- `GetDownloadURL()` — 15-minute presigned MinIO URLs
- `DeleteDocument()` — removes from both MinIO and DB
- Path pattern: `tenants/{tenantID}/projects/{projectID}/{docID}/{filename}`
- Allowed types: PDF, Word, Excel, PowerPoint, images, text, CSV, ZIP

### NATS Event System

**Orchestrator** at `itd-opms-api/internal/platform/notification/orchestrator.go`:
```go
type DomainEvent struct {
    Type          string          // e.g., "governance.action_overdue"
    TenantID      uuid.UUID
    ActorID       uuid.UUID
    EntityType    string
    EntityID      uuid.UUID
    Data          json.RawMessage
    CorrelationID string
    Timestamp     time.Time
}
```
Subscribed subjects: `notify.itsm.>`, `notify.governance.>`, `notify.cmdb.>`, `notify.grc.>`

### Capacity Allocations (Migration 011 — exists)

```sql
CREATE TABLE capacity_allocations (
    id UUID PRIMARY KEY, tenant_id UUID, user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    allocation_pct DECIMAL(5,2),  -- 0-100%
    period_start DATE, period_end DATE,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);
```

**Existing frontend page** at `itd-opms-portal/app/dashboard/people/capacity/page.tsx` — basic allocation bar view with over-allocation detection.

### Project Budget Fields (Migration 008 — exists)

```sql
-- In projects table:
budget_approved DECIMAL(15,2),
budget_spent    DECIMAL(15,2) DEFAULT 0,
completion_pct  DECIMAL(5,2)
```

**PortfolioAnalytics** type includes `TotalBudgetApproved`, `TotalBudgetSpent`.

### Custom Fields Precedent (Migration 009)

```sql
-- tickets table already has:
custom_fields JSONB
```

And `projects.metadata JSONB`, `work_items.metadata JSONB`, `org_units.metadata JSONB`, `tenants.config JSONB` — the JSONB pattern is established.

### Change Requests (Migration 008 — exists)

```sql
CREATE TABLE change_requests (
    id UUID PRIMARY KEY, tenant_id UUID, project_id UUID,
    title TEXT, description TEXT, justification TEXT, impact_assessment TEXT,
    status TEXT CHECK (status IN ('submitted','under_review','approved','rejected','implemented')),
    requested_by UUID, reviewed_by UUID, approval_chain_id UUID REFERENCES approval_chains(id),
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);
```

**Existing frontend** at `itd-opms-portal/app/dashboard/planning/change-requests/[id]/page.tsx` — detail page with workflow stepper and status transitions.

### ITSM Ticket Types

Tickets support types: `incident`, `service_request`, `problem`, `change`. Change tickets are auto-numbered `CHG-XXXXXX` but use the same status machine as incidents. **No dedicated change calendar or maintenance window scheduling exists.**

### Escalation Rules (Migration 009 — exists, unused)

```sql
CREATE TABLE escalation_rules (
    id UUID PRIMARY KEY, tenant_id UUID, name TEXT,
    trigger_type TEXT CHECK (trigger_type IN ('sla_warning','sla_breach','priority','manual')),
    trigger_config JSONB, escalation_chain JSONB,
    is_active BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);
```

### Warranty/License Tables (Migration 010)

```sql
CREATE TABLE warranties (
    id UUID, asset_id UUID, tenant_id UUID, vendor TEXT, contract_number TEXT,
    coverage_type TEXT, start_date DATE, end_date DATE, cost DECIMAL(15,2),
    renewal_status TEXT  -- active|expiring_soon|expired|renewed
);

CREATE TABLE licenses (
    id UUID, tenant_id UUID, software_name TEXT, vendor TEXT,
    license_type TEXT, total_entitlements INT, assigned_count INT,
    compliance_status TEXT, expiry_date DATE, cost DECIMAL(15,2), renewal_contact TEXT
);

CREATE TABLE renewal_alerts (
    id UUID, tenant_id UUID, entity_type TEXT, entity_id UUID,
    alert_date DATE, sent BOOLEAN DEFAULT false
);
```

---

## YOUR TASK — Implement 8 Features

### Feature 1: Approval Workflow Engine

**Requirement**: Build a fully functional approval workflow engine using the existing `workflow_definitions`, `approval_chains`, and `approval_steps` tables. Support configurable multi-step approval chains with sequential, parallel, and any-of-N approval modes. Integrate with change requests, policies, asset disposals, and any future entity type.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/024_approval_engine_enhancements.sql`**

Enhance the existing approval tables with additional fields:

```sql
-- +goose Up
-- Migration 024: Approval Engine Enhancements

-- Add fields to workflow_definitions for richer configuration
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS auto_assign_rules JSONB DEFAULT '{}';
-- auto_assign_rules: { "step_1": { "type": "role", "role": "division_head" }, "step_2": { "type": "user", "userId": "..." } }

-- Add urgency and deadline support to approval chains
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical'));
ALTER TABLE approval_chains ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add delegation and reminder tracking to approval steps
ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE approval_steps ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Approval delegation log
CREATE TABLE approval_delegations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    step_id         UUID NOT NULL REFERENCES approval_steps(id),
    delegated_by    UUID NOT NULL REFERENCES users(id),
    delegated_to    UUID NOT NULL REFERENCES users(id),
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_delegations_step ON approval_delegations(step_id);

-- Approval notifications log
CREATE TABLE approval_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id        UUID NOT NULL REFERENCES approval_chains(id),
    step_id         UUID REFERENCES approval_steps(id),
    recipient_id    UUID NOT NULL REFERENCES users(id),
    notification_type TEXT NOT NULL,  -- 'pending_approval', 'approved', 'rejected', 'reminder', 'delegated', 'deadline_approaching'
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

CREATE INDEX idx_approval_notifications_recipient ON approval_notifications(recipient_id) WHERE read_at IS NULL;
CREATE INDEX idx_approval_notifications_chain ON approval_notifications(chain_id);
```

**B. Create Go backend** — `itd-opms-api/internal/modules/approval/`

Create a new `approval` module with these files:

**`types.go`** — Domain types:
```go
package approval

import (
    "time"
    "github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Step mode in workflow definition
// ──────────────────────────────────────────────

// StepMode defines how approvals within a step are evaluated
type StepMode string

const (
    StepModeSequential StepMode = "sequential"  // All approvers in order
    StepModeParallel   StepMode = "parallel"     // All approvers simultaneously, all must approve
    StepModeAnyOf      StepMode = "any_of"       // Any N of M approvers (quorum)
)

// WorkflowStepDef defines a single step in a workflow template
type WorkflowStepDef struct {
    StepOrder   int      `json:"stepOrder"`
    Name        string   `json:"name"`        // e.g., "Line Manager Approval"
    Mode        StepMode `json:"mode"`        // sequential, parallel, any_of
    Quorum      int      `json:"quorum"`      // For any_of mode: how many approvals needed
    ApproverType string  `json:"approverType"` // "user", "role", "org_unit_head"
    ApproverIDs []string `json:"approverIds"` // User IDs, role names, or org_unit IDs
    TimeoutHours int     `json:"timeoutHours"` // Optional: auto-escalate after N hours (0 = no timeout)
    AllowDelegation bool `json:"allowDelegation"`
}

// WorkflowDefinition is the full workflow template
type WorkflowDefinition struct {
    ID          uuid.UUID          `json:"id"`
    TenantID    uuid.UUID          `json:"tenantId"`
    Name        string             `json:"name"`
    Description string             `json:"description"`
    EntityType  string             `json:"entityType"`
    Steps       []WorkflowStepDef  `json:"steps"`
    IsActive    bool               `json:"isActive"`
    Version     int                `json:"version"`
    CreatedBy   uuid.UUID          `json:"createdBy"`
    CreatedAt   time.Time          `json:"createdAt"`
    UpdatedAt   time.Time          `json:"updatedAt"`
}

// ApprovalChain is a running instance of a workflow
type ApprovalChain struct {
    ID                    uuid.UUID  `json:"id"`
    EntityType            string     `json:"entityType"`
    EntityID              uuid.UUID  `json:"entityId"`
    TenantID              uuid.UUID  `json:"tenantId"`
    WorkflowDefinitionID  *uuid.UUID `json:"workflowDefinitionId"`
    Status                string     `json:"status"`      // pending, in_progress, approved, rejected, cancelled
    CurrentStep           int        `json:"currentStep"`
    Urgency               string     `json:"urgency"`     // low, normal, high, critical
    Deadline              *time.Time `json:"deadline"`
    CreatedBy             uuid.UUID  `json:"createdBy"`
    CreatedAt             time.Time  `json:"createdAt"`
    CompletedAt           *time.Time `json:"completedAt"`
    Steps                 []ApprovalStep `json:"steps,omitempty"`
}

// ApprovalStep is an individual approver's decision
type ApprovalStep struct {
    ID            uuid.UUID  `json:"id"`
    ChainID       uuid.UUID  `json:"chainId"`
    StepOrder     int        `json:"stepOrder"`
    ApproverID    uuid.UUID  `json:"approverId"`
    ApproverName  string     `json:"approverName,omitempty"` // Joined from users
    Decision      string     `json:"decision"`    // pending, approved, rejected, skipped
    Comments      string     `json:"comments"`
    DecidedAt     *time.Time `json:"decidedAt"`
    DelegatedFrom *uuid.UUID `json:"delegatedFrom"`
    Deadline      *time.Time `json:"deadline"`
    CreatedAt     time.Time  `json:"createdAt"`
}

// ──────────────────────────────────────────────
// Request/Response types
// ──────────────────────────────────────────────

type CreateWorkflowDefinitionRequest struct {
    Name        string            `json:"name" validate:"required,min=3"`
    Description string            `json:"description"`
    EntityType  string            `json:"entityType" validate:"required,oneof=policy change_request disposal project risk audit"`
    Steps       []WorkflowStepDef `json:"steps" validate:"required,min=1"`
}

type UpdateWorkflowDefinitionRequest struct {
    Name        *string            `json:"name"`
    Description *string            `json:"description"`
    Steps       *[]WorkflowStepDef `json:"steps"`
    IsActive    *bool              `json:"isActive"`
}

type StartApprovalRequest struct {
    EntityType           string     `json:"entityType" validate:"required"`
    EntityID             uuid.UUID  `json:"entityId" validate:"required"`
    WorkflowDefinitionID *uuid.UUID `json:"workflowDefinitionId"` // Optional: auto-select by entity_type if nil
    Urgency              string     `json:"urgency" validate:"oneof=low normal high critical"`
    DeadlineHours        *int       `json:"deadlineHours"` // Optional: set deadline N hours from now
}

type ApprovalDecisionRequest struct {
    Decision string `json:"decision" validate:"required,oneof=approved rejected"`
    Comments string `json:"comments"`
}

type DelegateApprovalRequest struct {
    DelegateTo uuid.UUID `json:"delegateTo" validate:"required"`
    Reason     string    `json:"reason"`
}

type MyPendingApprovalsResponse struct {
    Items      []PendingApprovalItem `json:"items"`
    TotalCount int                   `json:"totalCount"`
}

type PendingApprovalItem struct {
    ChainID      uuid.UUID `json:"chainId"`
    StepID       uuid.UUID `json:"stepId"`
    EntityType   string    `json:"entityType"`
    EntityID     uuid.UUID `json:"entityId"`
    EntityTitle  string    `json:"entityTitle"` // Resolved entity title
    StepName     string    `json:"stepName"`
    Urgency      string    `json:"urgency"`
    Deadline     *time.Time `json:"deadline"`
    RequestedBy  string    `json:"requestedBy"` // Name of chain creator
    RequestedAt  time.Time `json:"requestedAt"`
}
```

**`handler.go`** — HTTP handler:
```go
// Route structure:
// /api/v1/approvals
//   GET    /workflows                 — List workflow definitions (admin)
//   POST   /workflows                 — Create workflow definition
//   GET    /workflows/{id}            — Get workflow definition
//   PUT    /workflows/{id}            — Update workflow definition
//   DELETE /workflows/{id}            — Deactivate workflow definition
//
//   POST   /chains                    — Start approval chain for an entity
//   GET    /chains/{id}               — Get approval chain with steps
//   POST   /chains/{id}/cancel        — Cancel an approval chain
//
//   GET    /my-pending                — Get current user's pending approvals
//   GET    /my-pending/count          — Get count only (for badge in header)
//   POST   /steps/{id}/decide         — Approve or reject a step
//   POST   /steps/{id}/delegate       — Delegate to another user
//
//   GET    /entity/{type}/{id}        — Get approval chain for a specific entity
//   GET    /history                   — Get all approval activity (paginated, filterable)
```

Permissions:
- `approval.view` — view chains, pending approvals
- `approval.manage` — create workflows, start chains
- Approvers can always decide on their own pending steps (no special permission needed)

**`service.go`** — Core approval engine logic:

The service must implement the core workflow engine:

1. **StartApproval**: Given an entity, find the matching active workflow definition (by `entity_type`), create an `approval_chain`, create `approval_steps` for step 1, set chain status to `in_progress`, publish NATS event `notify.approval.started`.

2. **ProcessDecision**: When an approver makes a decision:
   - Validate the step belongs to the approver and is pending
   - Record the decision and timestamp
   - **If approved**: Check if the current step is complete (all required approvals for the step mode):
     - `sequential`: Single approver per step → advance to next step
     - `parallel`: All approvers in the step must approve → check if all have decided
     - `any_of`: Check if quorum is met
   - If current step complete and more steps exist → advance `current_step`, create steps for next step
   - If all steps complete → set chain status to `approved`, publish `notify.approval.completed`
   - **If rejected**: Set chain status to `rejected`, publish `notify.approval.rejected`

3. **DelegateStep**: Transfer a pending step to another user. Create delegation log entry. Publish `notify.approval.delegated`.

4. **GetMyPending**: Query all pending approval_steps for the current user, joined with chain and entity info. This powers the "My Approvals" queue and the header notification badge.

5. **CancelChain**: Set status to `cancelled`, mark all pending steps as `skipped`.

6. **Reminder worker** (background goroutine): Periodically check for pending steps approaching their deadline. Publish `notify.approval.reminder` events. Update `reminder_sent_at`.

**`queries/approval.sql`** — SQL queries:
```sql
-- name: ListWorkflowDefinitions :many
SELECT * FROM workflow_definitions
WHERE tenant_id = @tenant_id AND is_active = true
ORDER BY entity_type, name;

-- name: GetWorkflowDefinitionByEntityType :one
SELECT * FROM workflow_definitions
WHERE tenant_id = @tenant_id AND entity_type = @entity_type AND is_active = true
ORDER BY created_at DESC LIMIT 1;

-- name: CreateApprovalChain :one
INSERT INTO approval_chains (entity_type, entity_id, tenant_id, workflow_definition_id, status, current_step, urgency, deadline, created_by)
VALUES (@entity_type, @entity_id, @tenant_id, @workflow_definition_id, 'in_progress', 1, @urgency, @deadline, @created_by)
RETURNING *;

-- name: CreateApprovalStep :one
INSERT INTO approval_steps (chain_id, step_order, approver_id, deadline)
VALUES (@chain_id, @step_order, @approver_id, @deadline)
RETURNING *;

-- name: GetPendingStepsForUser :many
SELECT s.*, c.entity_type, c.entity_id, c.urgency, c.deadline AS chain_deadline, c.created_by, c.created_at AS chain_created_at
FROM approval_steps s
JOIN approval_chains c ON c.id = s.chain_id
WHERE s.approver_id = @user_id AND s.decision = 'pending' AND c.status = 'in_progress' AND c.tenant_id = @tenant_id
ORDER BY c.urgency DESC, c.created_at ASC;

-- name: CountPendingStepsForUser :one
SELECT COUNT(*) FROM approval_steps s
JOIN approval_chains c ON c.id = s.chain_id
WHERE s.approver_id = @user_id AND s.decision = 'pending' AND c.status = 'in_progress' AND c.tenant_id = @tenant_id;

-- name: RecordDecision :exec
UPDATE approval_steps SET decision = @decision, comments = @comments, decided_at = NOW()
WHERE id = @id AND approver_id = @approver_id AND decision = 'pending';

-- name: AdvanceChainStep :exec
UPDATE approval_chains SET current_step = current_step + 1, updated_at = NOW()
WHERE id = @id;

-- name: CompleteChain :exec
UPDATE approval_chains SET status = @status, completed_at = NOW()
WHERE id = @id;

-- name: GetApprovalChainForEntity :one
SELECT * FROM approval_chains
WHERE entity_type = @entity_type AND entity_id = @entity_id AND tenant_id = @tenant_id
ORDER BY created_at DESC LIMIT 1;

-- name: GetApprovalStepsForChain :many
SELECT s.*, u.display_name AS approver_name
FROM approval_steps s
JOIN users u ON u.id = s.approver_id
WHERE s.chain_id = @chain_id
ORDER BY s.step_order, s.created_at;
```

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/governance/approvals/page.tsx`** — My Approvals Queue

A page showing the current user's pending approvals with:
- Summary cards: Pending count, Approved today, Overdue count
- Table of pending items with columns: Entity Type, Title, Requested By, Step, Urgency, Deadline, Actions
- Quick approve/reject buttons inline (with comment modal for rejections)
- Filter by entity type, urgency
- Link to entity detail page

**Page: `itd-opms-portal/app/dashboard/system/workflows/page.tsx`** — Workflow Definition Manager (admin)

An admin page for creating and managing workflow definitions:
- List all workflow definitions grouped by entity type
- Create/edit form with:
  - Name, description, entity type (dropdown)
  - Step builder: Add steps with name, mode (sequential/parallel/any_of), quorum, approver selection (user picker or role dropdown), timeout
  - Drag to reorder steps (use @dnd-kit)
  - Preview of the approval flow as a visual stepper
- Activate/deactivate toggle

**Component: `itd-opms-portal/components/shared/approval-status.tsx`** — Reusable approval status widget

Embed this component on any entity detail page (change request, policy, disposal) to show:
- Current approval chain status with visual stepper (step 1 ✓ → step 2 ● → step 3 ○)
- Per-step: approver name, decision, timestamp, comments
- Action buttons if current user is the pending approver: Approve / Reject / Delegate
- Start Approval button if no chain exists yet

**Hooks: `itd-opms-portal/hooks/use-approvals.ts`**:
```typescript
// Workflow definitions
export function useWorkflowDefinitions(entityType?: string)
export function useWorkflowDefinition(id: string)
export function useCreateWorkflowDefinition()
export function useUpdateWorkflowDefinition(id: string)
export function useDeleteWorkflowDefinition(id: string)

// Approval chains
export function useStartApproval()
export function useApprovalChain(id: string)
export function useApprovalChainForEntity(entityType: string, entityId: string)
export function useCancelApproval(chainId: string)

// Approver actions
export function useMyPendingApprovals()
export function useMyPendingApprovalCount()  // For header badge
export function useApproveStep(stepId: string)
export function useRejectStep(stepId: string)
export function useDelegateStep(stepId: string)

// History
export function useApprovalHistory(filters?: ApprovalHistoryFilters)
```

**D. Integrate approval widget into existing entity detail pages**

Add the `<ApprovalStatus>` widget to these existing pages:
- `planning/change-requests/[id]/page.tsx` — replace the simple status stepper with the full approval widget
- `governance/policies/[slug]/page.tsx` — add approval chain for policy review workflows
- `cmdb/assets/[id]/page.tsx` — for asset disposal approvals

When an entity's approval chain completes with "approved" status, the entity's own status should auto-advance (e.g., change_request: under_review → approved).

---

### Feature 2: Change Calendar

**Requirement**: Create a shared calendar view showing planned changes, maintenance windows, deployments, and milestones across both ITSM and Planning modules.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/025_change_calendar.sql`**

```sql
-- +goose Up
-- Migration 025: Change Calendar & Maintenance Windows

CREATE TABLE maintenance_windows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    description     TEXT,
    window_type     TEXT NOT NULL CHECK (window_type IN ('maintenance', 'deployment', 'release', 'freeze', 'outage')),
    status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    is_all_day      BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,  -- iCal RRULE format, null for one-time
    affected_services TEXT[] DEFAULT '{}',
    impact_level    TEXT DEFAULT 'low' CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
    change_request_id UUID REFERENCES change_requests(id),
    ticket_id       UUID,  -- Reference to ITSM change ticket
    project_id      UUID REFERENCES projects(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_windows_tenant ON maintenance_windows(tenant_id);
CREATE INDEX idx_maintenance_windows_dates ON maintenance_windows(start_time, end_time);
CREATE INDEX idx_maintenance_windows_status ON maintenance_windows(status) WHERE status IN ('scheduled', 'in_progress');

CREATE TRIGGER trg_maintenance_windows_updated
    BEFORE UPDATE ON maintenance_windows
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Change freeze periods (block changes during critical periods)
CREATE TABLE change_freeze_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    reason          TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    exceptions      JSONB DEFAULT '[]',  -- entity IDs allowed during freeze
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_freeze_periods_dates ON change_freeze_periods(start_time, end_time);
```

**B. Create Go backend** — Add to existing modules or create `itd-opms-api/internal/modules/calendar/`

**`handler.go`** endpoints:
```
/api/v1/calendar
  GET    /events            — List calendar events (date range, type filters)
  POST   /maintenance-windows   — Create maintenance window
  GET    /maintenance-windows/{id}
  PUT    /maintenance-windows/{id}
  DELETE /maintenance-windows/{id}
  POST   /freeze-periods    — Create change freeze period
  GET    /freeze-periods
  DELETE /freeze-periods/{id}
  GET    /conflicts          — Check for scheduling conflicts in a date range
```

**`service.go`** — Calendar aggregation:

The `GetCalendarEvents` method aggregates events from multiple sources into a unified calendar:

```go
type CalendarEvent struct {
    ID          uuid.UUID  `json:"id"`
    Title       string     `json:"title"`
    Description string     `json:"description,omitempty"`
    StartTime   time.Time  `json:"startTime"`
    EndTime     time.Time  `json:"endTime"`
    IsAllDay    bool       `json:"isAllDay"`
    EventType   string     `json:"eventType"`   // maintenance, deployment, release, freeze, milestone, change_request, ticket_change
    Status      string     `json:"status"`
    ImpactLevel string     `json:"impactLevel,omitempty"`
    Source      string     `json:"source"`       // itsm, planning, calendar
    SourceID    uuid.UUID  `json:"sourceId"`     // Original entity ID
    SourceURL   string     `json:"sourceUrl"`    // Frontend URL to source entity
    Color       string     `json:"color"`        // Hex color for calendar display
    CreatedBy   string     `json:"createdBy,omitempty"`
}
```

Aggregate from:
1. **Maintenance windows** — direct from the new table
2. **Change freeze periods** — rendered as full-width background events
3. **Change requests** (planning module) — `planned_start` to `planned_end` if set, otherwise just `created_at`
4. **ITSM change tickets** — tickets with `type = 'change'` that have scheduled times
5. **Milestones** (planning module) — `target_date` as single-day events
6. **Project deadlines** — `planned_end` dates

Each source type gets a distinct color:
- maintenance: `#3B82F6` (blue)
- deployment: `#8B5CF6` (purple)
- release: `#10B981` (green)
- freeze: `#EF4444` (red, striped background)
- milestone: `#F59E0B` (amber)
- change_request: `#6366F1` (indigo)

**Conflict detection**: `CheckConflicts(start, end)` returns overlapping events and freeze periods. Used when creating new maintenance windows to warn about conflicts.

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/planning/calendar/page.tsx`** — Change Calendar

Full calendar view with month, week, and day views:

```typescript
interface CalendarViewProps {
  events: CalendarEvent[];
  view: "month" | "week" | "day";
  selectedDate: Date;
}
```

**Build a custom calendar component** (no external library — keep the no-external-deps pattern):

1. **Month view**: Grid of 7×5/6 cells. Events rendered as colored bars spanning their duration. Overflow shows "+N more" tooltip.

2. **Week view**: 7 columns with hourly rows (7am-10pm). Events positioned by time with overlapping support. All-day events in a top rail.

3. **Day view**: Single column with 30-minute slots. Detailed event cards with description.

4. **Left sidebar**: Mini month navigator + filter checkboxes for event types + color legend.

5. **Top toolbar**: View toggle (Month/Week/Day), Today button, Previous/Next navigation, "New Window" button.

6. **Event cards**: Click to open detail popover with: title, description, time, impact, source link. Edit/delete for maintenance windows.

7. **Freeze periods**: Rendered as red-tinted background overlay across the frozen time range with "Change Freeze" label.

8. **Create maintenance window modal**: Form with title, type, start/end datetime pickers, impact level, affected services (multi-select), link to change request (optional).

9. **Conflict warnings**: When creating/editing a window, check for conflicts and show warnings.

**Hooks: `itd-opms-portal/hooks/use-calendar.ts`**:
```typescript
export function useCalendarEvents(startDate: string, endDate: string, types?: string[])
export function useMaintenanceWindow(id: string)
export function useCreateMaintenanceWindow()
export function useUpdateMaintenanceWindow(id: string)
export function useDeleteMaintenanceWindow(id: string)
export function useFreezePeriods()
export function useCreateFreezePeriod()
export function useDeleteFreezePeriod(id: string)
export function useConflictCheck(start: string, end: string)
```

---

### Feature 3: Resource Heatmap

**Requirement**: Create a visual capacity planning heatmap showing over/under-allocation across team members, projects, and time periods. The `capacity_allocations` table already exists — this feature adds the visual heatmap layer.

#### What to Build:

**A. Add backend analytics endpoint**

Add to the people module handler or create a new handler:

```
GET /api/v1/people/capacity/heatmap?start={date}&end={date}&group_by={user|project}&granularity={week|month}
```

**Response:**
```go
type HeatmapResponse struct {
    Periods []string         `json:"periods"`  // Column headers: ["2026-W01", "2026-W02", ...]
    Rows    []HeatmapRow     `json:"rows"`
    Summary HeatmapSummary   `json:"summary"`
}

type HeatmapRow struct {
    ID             uuid.UUID        `json:"id"`      // User ID or Project ID
    Label          string           `json:"label"`   // User name or Project title
    Cells          []HeatmapCell    `json:"cells"`   // One per period
    AverageLoad    float64          `json:"averageLoad"` // Average allocation %
}

type HeatmapCell struct {
    Period       string   `json:"period"`       // "2026-W01" or "2026-01"
    AllocationPct float64 `json:"allocationPct"` // Total allocation % for this period
    ProjectCount  int     `json:"projectCount"`  // Number of projects in this period
    Projects     []struct {
        ID    uuid.UUID `json:"id"`
        Title string    `json:"title"`
        Pct   float64   `json:"pct"`
    } `json:"projects,omitempty"` // Breakdown per project
}

type HeatmapSummary struct {
    TotalUsers         int     `json:"totalUsers"`
    OverAllocatedUsers int     `json:"overAllocatedUsers"`   // >100%
    UnderUtilizedUsers int     `json:"underUtilizedUsers"`   // <50%
    AverageUtilization float64 `json:"averageUtilization"`
}
```

The query should:
- Group `capacity_allocations` by user (or project) and time period
- Sum `allocation_pct` per cell
- Join `users` and `projects` for labels
- Support week or month granularity

**B. Create frontend heatmap page**

**Page: `itd-opms-portal/app/dashboard/people/capacity/heatmap/page.tsx`**

Or enhance the existing `capacity/page.tsx` with a heatmap tab.

**Heatmap grid:**
- **Rows**: Team members (or projects if grouped by project)
- **Columns**: Time periods (weeks or months)
- **Cells**: Color-coded by allocation percentage:
  - `0%`: White/transparent
  - `1-50%`: Light green (`#DCFCE7`)
  - `51-80%`: Green (`#86EFAC`)
  - `81-100%`: Blue (`#93C5FD`)
  - `101-120%`: Orange (`#FED7AA`)
  - `121%+`: Red (`#FCA5A5`)

**Features:**
1. **Hover tooltip**: Show allocation breakdown per project for each cell
2. **Click cell**: Open detail panel showing all allocations in that period for that user
3. **Row summary**: Average allocation % and sparkline trend
4. **Column summary**: Total team utilization % for that period
5. **Filters**: Date range picker, team/division filter, group-by toggle (user/project)
6. **Granularity toggle**: Week vs Month view
7. **Over-allocation alerts**: Banner at top showing users >100% with quick link to adjust

**Inline allocation editing** (optional): Click an empty cell to create a new allocation, or click a colored cell to edit the existing allocation percentage.

**C. Add allocation management endpoints** (if not already complete):

```
POST   /api/v1/people/capacity/allocations       — Create allocation
PUT    /api/v1/people/capacity/allocations/{id}   — Update allocation
DELETE /api/v1/people/capacity/allocations/{id}   — Delete allocation
GET    /api/v1/people/capacity/allocations        — List with filters (user_id, project_id, date range)
```

---

### Feature 4: Budget & Cost Tracking

**Requirement**: Enhance the existing project budget fields with a full cost tracking system including line-item expenses, burn-rate charts, and budget forecasting.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/026_budget_tracking.sql`**

```sql
-- +goose Up
-- Migration 026: Budget & Cost Tracking

-- Cost categories for line-item tracking
CREATE TABLE cost_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    code        TEXT,          -- e.g., "HW", "SW", "SVC", "HR"
    parent_id   UUID REFERENCES cost_categories(id),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_categories_tenant ON cost_categories(tenant_id);

-- Project cost entries (line items)
CREATE TABLE project_cost_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES cost_categories(id),
    description     TEXT NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    entry_type      TEXT NOT NULL CHECK (entry_type IN ('actual', 'committed', 'forecast')),
    entry_date      DATE NOT NULL,
    vendor_name     TEXT,
    invoice_ref     TEXT,
    document_id     UUID REFERENCES documents(id),  -- Supporting document
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_entries_project ON project_cost_entries(project_id);
CREATE INDEX idx_cost_entries_date ON project_cost_entries(entry_date);
CREATE INDEX idx_cost_entries_type ON project_cost_entries(entry_type);

CREATE TRIGGER trg_cost_entries_updated
    BEFORE UPDATE ON project_cost_entries
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Budget snapshots for historical tracking
CREATE TABLE budget_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    approved_budget DECIMAL(15,2) NOT NULL,
    actual_spend    DECIMAL(15,2) NOT NULL,
    committed_spend DECIMAL(15,2) NOT NULL DEFAULT 0,
    forecast_total  DECIMAL(15,2) NOT NULL DEFAULT 0,
    completion_pct  DECIMAL(5,2),
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_snapshots_project ON budget_snapshots(project_id, snapshot_date);

-- Auto-update projects.budget_spent when cost entries change
CREATE OR REPLACE FUNCTION fn_update_project_budget_spent() RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects SET budget_spent = (
        SELECT COALESCE(SUM(amount), 0) FROM project_cost_entries
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND entry_type = 'actual'
    ), updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cost_entry_budget_sync
    AFTER INSERT OR UPDATE OR DELETE ON project_cost_entries
    FOR EACH ROW EXECUTE FUNCTION fn_update_project_budget_spent();
```

**B. Create Go backend**

Add to the planning module or create `itd-opms-api/internal/modules/planning/budget_handler.go`:

```
/api/v1/planning/projects/{projectId}/budget
  GET    /summary           — Budget summary (approved, actual, committed, forecast, variance)
  GET    /entries            — List cost entries (paginated, filterable by type, category, date range)
  POST   /entries            — Create cost entry
  PUT    /entries/{id}       — Update cost entry
  DELETE /entries/{id}       — Delete cost entry
  GET    /burn-rate          — Monthly burn rate data for charts
  GET    /forecast           — Projected completion cost based on current burn rate
  POST   /snapshots          — Create budget snapshot (for historical tracking)
  GET    /snapshots          — List snapshots

/api/v1/planning/budget
  GET    /cost-categories    — List cost categories
  POST   /cost-categories    — Create cost category
  PUT    /cost-categories/{id}
  DELETE /cost-categories/{id}
  GET    /portfolio-summary  — Cross-project budget overview
```

**Budget summary response:**
```go
type BudgetSummary struct {
    ProjectID       uuid.UUID `json:"projectId"`
    ApprovedBudget  float64   `json:"approvedBudget"`
    ActualSpend     float64   `json:"actualSpend"`
    CommittedSpend  float64   `json:"committedSpend"`
    ForecastTotal   float64   `json:"forecastTotal"`
    RemainingBudget float64   `json:"remainingBudget"`
    VariancePct     float64   `json:"variancePct"`      // (actual/approved - 1) * 100
    BurnRate        float64   `json:"burnRate"`          // Average monthly spend
    MonthsRemaining float64   `json:"monthsRemaining"`   // Based on planned_end
    EstimatedAtCompletion float64 `json:"estimatedAtCompletion"` // EAC = actual + remaining forecast
    CostPerformanceIndex  float64 `json:"costPerformanceIndex"`  // CPI = earned value / actual cost
    ByCategory      []CategorySpend `json:"byCategory"`
}

type CategorySpend struct {
    CategoryID   uuid.UUID `json:"categoryId"`
    CategoryName string    `json:"categoryName"`
    Actual       float64   `json:"actual"`
    Committed    float64   `json:"committed"`
    Forecast     float64   `json:"forecast"`
}

type BurnRatePoint struct {
    Period   string  `json:"period"`  // "2026-01"
    Actual   float64 `json:"actual"`
    Committed float64 `json:"committed"`
    Forecast float64 `json:"forecast"`
    CumulativeActual float64 `json:"cumulativeActual"`
    BudgetLine       float64 `json:"budgetLine"` // Straight-line budget
}
```

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/planning/projects/[id]/budget/page.tsx`** — Project Budget Dashboard

1. **Summary cards**: Approved Budget, Actual Spend, Committed, Remaining, Variance %, CPI
   - Color-code: Green (under budget), Amber (80-100% spent), Red (over budget)

2. **Burn rate chart** (Recharts `AreaChart`):
   - X-axis: Months
   - Y-axis: Cumulative cost
   - Lines: Approved budget (straight line), Actual (filled area), Forecast (dashed), EAC projection
   - Vertical line for "today"

3. **Category breakdown** (Recharts `PieChart` or `BarChart`):
   - Split by cost category showing actual vs. committed vs. forecast per category

4. **Cost entries table** (`DataTable`):
   - Columns: Date, Description, Category, Type (actual/committed/forecast), Amount, Vendor, Invoice Ref, Actions
   - Add entry form (side panel or modal)
   - Inline editing for amount and date
   - Filter by type, category, date range

5. **Budget history** (sparkline showing budget_snapshots over time)

**Page: `itd-opms-portal/app/dashboard/planning/budget/page.tsx`** — Portfolio Budget Overview

Cross-project budget view:
- Table of all projects with budget columns: Approved, Spent, Remaining, Variance %, Status
- Stacked bar chart showing budget allocation across projects
- Filter by portfolio, status, RAG

**Hooks: `itd-opms-portal/hooks/use-budget.ts`**:
```typescript
export function useBudgetSummary(projectId: string)
export function useCostEntries(projectId: string, filters?: CostEntryFilters)
export function useCreateCostEntry(projectId: string)
export function useUpdateCostEntry(projectId: string, entryId: string)
export function useDeleteCostEntry(projectId: string, entryId: string)
export function useBurnRate(projectId: string)
export function useBudgetForecast(projectId: string)
export function useBudgetSnapshots(projectId: string)
export function useCreateBudgetSnapshot(projectId: string)
export function useCostCategories()
export function useCreateCostCategory()
export function usePortfolioBudgetSummary(filters?: PortfolioBudgetFilters)
```

---

### Feature 5: Vendor/Contract Management

**Requirement**: Create a dedicated vendor/contract management module that consolidates vendor information from CMDB warranties, licenses, and adds new contract tracking, performance scorecards, and renewal management.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/027_vendor_management.sql`**

```sql
-- +goose Up
-- Migration 027: Vendor/Contract Management

-- Vendor registry (consolidate all vendor references)
CREATE TABLE vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    code            TEXT,                      -- Short vendor code
    vendor_type     TEXT NOT NULL CHECK (vendor_type IN ('hardware', 'software', 'services', 'cloud', 'telecom', 'consulting', 'other')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review', 'blacklisted')),
    -- Contact info
    primary_contact_name    TEXT,
    primary_contact_email   TEXT,
    primary_contact_phone   TEXT,
    account_manager_name    TEXT,
    account_manager_email   TEXT,
    -- Details
    website         TEXT,
    address         TEXT,
    tax_id          TEXT,
    payment_terms   TEXT,           -- e.g., "Net 30", "Net 60"
    notes           TEXT,
    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_vendors_tenant_name ON vendors(tenant_id, LOWER(name));
CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);

CREATE TRIGGER trg_vendors_updated
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Contracts
CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    contract_number TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    contract_type   TEXT NOT NULL CHECK (contract_type IN ('license', 'support', 'maintenance', 'consulting', 'cloud_service', 'hardware', 'sla', 'nda', 'msa', 'other')),
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expiring_soon', 'expired', 'renewed', 'terminated', 'under_review')),
    -- Dates
    start_date      DATE NOT NULL,
    end_date        DATE,
    auto_renew      BOOLEAN DEFAULT false,
    renewal_notice_days INT DEFAULT 90,
    -- Financial
    total_value     DECIMAL(15,2),
    annual_value    DECIMAL(15,2),
    currency        TEXT DEFAULT 'NGN',
    payment_schedule TEXT,  -- monthly, quarterly, annually, one-time
    -- SLA tracking
    sla_terms       JSONB DEFAULT '{}',  -- { "uptime": 99.9, "response_time_hours": 4, "resolution_time_hours": 24 }
    -- Documents
    document_ids    UUID[] DEFAULT '{}',  -- References to documents table
    -- Management
    owner_id        UUID REFERENCES users(id),
    approval_chain_id UUID REFERENCES approval_chains(id),
    tags            TEXT[] DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_contracts_number ON contracts(tenant_id, contract_number);
CREATE INDEX idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX idx_contracts_status ON contracts(status) WHERE status IN ('active', 'expiring_soon');
CREATE INDEX idx_contracts_end_date ON contracts(end_date) WHERE end_date IS NOT NULL;

CREATE TRIGGER trg_contracts_updated
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Vendor performance scorecards
CREATE TABLE vendor_scorecards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    contract_id     UUID REFERENCES contracts(id),
    review_period   TEXT NOT NULL,           -- "2026-Q1", "2026-01"
    -- Scores (1-5 scale)
    quality_score       DECIMAL(3,1),
    delivery_score      DECIMAL(3,1),
    responsiveness_score DECIMAL(3,1),
    cost_score          DECIMAL(3,1),
    compliance_score    DECIMAL(3,1),
    overall_score       DECIMAL(3,1),        -- Weighted average
    -- Details
    strengths       TEXT,
    weaknesses      TEXT,
    improvement_areas TEXT,
    notes           TEXT,
    -- SLA compliance
    sla_metrics     JSONB DEFAULT '{}',  -- { "uptime_actual": 99.85, "incidents": 3, "avg_response_hours": 2.5 }
    reviewed_by     UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_scorecards_vendor ON vendor_scorecards(vendor_id);
CREATE INDEX idx_vendor_scorecards_period ON vendor_scorecards(review_period);

-- Contract renewal tracking
CREATE TABLE contract_renewals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID NOT NULL REFERENCES contracts(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    renewal_type    TEXT NOT NULL CHECK (renewal_type IN ('renewal', 'renegotiation', 'termination', 'upgrade', 'downgrade')),
    new_start_date  DATE,
    new_end_date    DATE,
    new_value       DECIMAL(15,2),
    change_notes    TEXT,
    approval_chain_id UUID REFERENCES approval_chains(id),
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_renewals_contract ON contract_renewals(contract_id);
```

**B. Create Go backend** — `itd-opms-api/internal/modules/vendor/`

**`handler.go`** endpoints:
```
/api/v1/vendors
  GET    /                   — List vendors (paginated, searchable, filterable by type, status)
  POST   /                   — Create vendor
  GET    /{id}               — Get vendor detail (with contracts and scorecards)
  PUT    /{id}               — Update vendor
  DELETE /{id}               — Deactivate vendor
  GET    /{id}/contracts     — List vendor's contracts
  GET    /{id}/scorecards    — List vendor's performance scorecards
  GET    /{id}/summary       — Vendor summary stats (total spend, contract count, avg score)

/api/v1/contracts
  GET    /                   — List all contracts (paginated, filterable)
  POST   /                   — Create contract
  GET    /{id}               — Get contract detail
  PUT    /{id}               — Update contract
  DELETE /{id}               — Delete/deactivate contract
  GET    /expiring           — List contracts expiring within N days (default 90)
  POST   /{id}/renew         — Initiate contract renewal
  GET    /dashboard          — Contract dashboard stats

/api/v1/vendor-scorecards
  POST   /                   — Create scorecard entry
  GET    /{id}               — Get scorecard detail
  PUT    /{id}               — Update scorecard
```

Permissions: `vendor.view`, `vendor.manage`

**Renewal alert worker**: Background goroutine that checks for contracts with `end_date` within `renewal_notice_days`. Creates `renewal_alerts` entries and publishes `notify.vendor.contract_expiring` events.

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/cmdb/vendors/page.tsx`** — Vendor Registry

- Summary cards: Total Vendors, Active Contracts, Expiring Soon, Total Annual Value
- Vendor table with columns: Name, Type, Status, Active Contracts, Annual Spend, Avg Score, Actions
- Search by name, filter by type/status

**Page: `itd-opms-portal/app/dashboard/cmdb/vendors/[id]/page.tsx`** — Vendor Detail

Tabbed layout:
1. **Overview**: Contact info, details, summary stats
2. **Contracts**: Table of contracts with status badges, value, dates, renewal alerts
3. **Performance**: Scorecard history with radar chart (Recharts `RadarChart`) showing 5 dimensions, trend line of overall score
4. **Documents**: Linked documents from document vault
5. **Spend Analysis**: Bar chart of spend by month/quarter

**Page: `itd-opms-portal/app/dashboard/cmdb/contracts/page.tsx`** — Contract Dashboard

- Expiring contracts alert banner (count of contracts expiring in 30/60/90 days)
- Contract pipeline: Visual cards grouped by status
- Table view with all contracts, sortable by value, end date, status
- Bulk actions: export, renew

**Scorecard creation form**: Rating sliders (1-5) for each dimension, text areas for strengths/weaknesses, SLA metric fields.

**Hooks: `itd-opms-portal/hooks/use-vendors.ts`**:
```typescript
export function useVendors(filters?: VendorFilters)
export function useVendor(id: string)
export function useCreateVendor()
export function useUpdateVendor(id: string)
export function useDeleteVendor(id: string)
export function useVendorSummary(id: string)

export function useContracts(filters?: ContractFilters)
export function useContract(id: string)
export function useCreateContract()
export function useUpdateContract(id: string)
export function useExpiringContracts(daysAhead?: number)
export function useContractDashboard()
export function useRenewContract(id: string)

export function useVendorScorecards(vendorId: string)
export function useCreateScorecard()
export function useUpdateScorecard(id: string)
```

---

### Feature 6: Document Vault

**Requirement**: Create a centralized document management system with full versioning, folder organization, tagging, access control, and search — leveraging the existing MinIO setup and `documents` table.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/028_document_vault.sql`**

```sql
-- +goose Up
-- Migration 028: Document Vault Enhancements

-- Document folders for organization
CREATE TABLE document_folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    parent_id   UUID REFERENCES document_folders(id),
    name        TEXT NOT NULL,
    description TEXT,
    path        TEXT NOT NULL,  -- Full path: "/policies/2026/quarterly"
    color       TEXT,           -- Optional folder color
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, path)
);

CREATE INDEX idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX idx_document_folders_path ON document_folders(tenant_id, path);

CREATE TRIGGER trg_document_folders_updated
    BEFORE UPDATE ON document_folders
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Add folder reference, version tracking, and lock support to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id);  -- Previous version
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX idx_documents_folder ON documents(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX idx_documents_parent ON documents(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX idx_documents_latest ON documents(tenant_id, is_latest) WHERE is_latest = true;
CREATE INDEX idx_documents_status ON documents(status) WHERE status = 'active';

-- Document access log
CREATE TABLE document_access_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,  -- 'view', 'download', 'edit', 'upload_version', 'lock', 'unlock', 'move', 'archive'
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_access_log_doc ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user ON document_access_log(user_id);

-- Document shares (share specific documents with users/roles)
CREATE TABLE document_shares (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    shared_with_user_id UUID REFERENCES users(id),
    shared_with_role    TEXT,  -- Share with entire role
    permission  TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'manage')),
    shared_by   UUID NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_shares_doc ON document_shares(document_id);
CREATE INDEX idx_document_shares_user ON document_shares(shared_with_user_id);
```

**B. Create Go backend** — `itd-opms-api/internal/modules/vault/`

Extend the existing `DocumentService` pattern from the planning module. Create a new module that reuses the MinIO client and `documents` table:

**`handler.go`** endpoints:
```
/api/v1/vault
  GET    /documents          — List documents (paginated, filterable by folder, classification, tags, search)
  POST   /documents          — Upload new document (multipart)
  GET    /documents/{id}     — Get document metadata
  PUT    /documents/{id}     — Update metadata (title, description, tags, classification)
  DELETE /documents/{id}     — Soft delete (set status='deleted')
  GET    /documents/{id}/download    — Get presigned download URL
  POST   /documents/{id}/version     — Upload new version (creates new document linked via parent_document_id)
  GET    /documents/{id}/versions    — List all versions of a document
  POST   /documents/{id}/lock        — Lock for editing
  POST   /documents/{id}/unlock      — Release lock
  POST   /documents/{id}/move        — Move to different folder
  POST   /documents/{id}/share       — Share with user/role
  GET    /documents/{id}/access-log  — Get access history

  GET    /folders            — List folders (tree structure)
  POST   /folders            — Create folder
  PUT    /folders/{id}       — Rename/move folder
  DELETE /folders/{id}       — Delete empty folder

  GET    /search             — Full-text search across document titles, descriptions, tags
  GET    /recent             — Recently uploaded/viewed documents (for current user)
  GET    /stats              — Vault statistics (total docs, total size, by classification)
```

Permissions: `documents.view`, `documents.manage`

**Version upload logic:**
1. Accept new file via multipart upload
2. Create new `documents` row with `version = previous.version + 1`, `parent_document_id = previous.id`
3. Set `is_latest = false` on the previous version
4. Store in MinIO at same path pattern but with version suffix
5. Log to `document_access_log`

**Lock logic:**
1. `Lock`: Set `locked_by` and `locked_at` on the document. Fail if already locked by someone else.
2. `Unlock`: Clear `locked_by`/`locked_at`. Only the locker or an admin can unlock.
3. Prevent version upload by non-locker when document is locked.

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/vault/page.tsx`** — Document Vault

Full document management UI:

1. **Left sidebar**: Folder tree with expand/collapse, right-click context menu (new folder, rename, delete)
2. **Main area**: Document grid or list view (toggle)
   - **Grid view**: Document cards with icon by type (PDF, Word, Excel, Image, etc.), title, date, size
   - **List view**: Table with columns: Name, Type, Size, Classification, Tags, Modified, Owner, Actions
3. **Top toolbar**: Search bar, Upload button, New Folder button, View toggle (grid/list), Sort dropdown, Filter by classification/tags
4. **Breadcrumb**: Current folder path with clickable segments
5. **Upload**: Drag-and-drop zone + file picker button. Show upload progress. Support multi-file upload.
6. **Document detail panel** (side drawer): Opens when clicking a document:
   - Preview (for images and PDFs)
   - Metadata: title, description, classification, tags, access level
   - Version history: List of all versions with download links
   - Access log: Who viewed/downloaded when
   - Shares: Who has access, manage shares
   - Actions: Download, Upload New Version, Lock/Unlock, Move, Archive, Delete

7. **Version comparison**: Side-by-side view of version metadata (not file content — just which version was uploaded when by whom)

**Upload component**: `itd-opms-portal/components/shared/document-upload.tsx`
- Drag-and-drop zone with visual feedback
- Multi-file support with progress bars
- File type validation
- Size limit display (50MB)
- Reusable across any page that needs file upload

**Hooks: `itd-opms-portal/hooks/use-vault.ts`**:
```typescript
export function useDocuments(filters?: DocumentFilters)
export function useDocument(id: string)
export function useUploadDocument()
export function useUpdateDocument(id: string)
export function useDeleteDocument(id: string)
export function useDocumentDownloadUrl(id: string)
export function useUploadVersion(id: string)
export function useDocumentVersions(id: string)
export function useLockDocument(id: string)
export function useUnlockDocument(id: string)
export function useMoveDocument(id: string)
export function useShareDocument(id: string)
export function useDocumentAccessLog(id: string)

export function useFolders()
export function useCreateFolder()
export function useUpdateFolder(id: string)
export function useDeleteFolder(id: string)

export function useVaultSearch(query: string)
export function useRecentDocuments()
export function useVaultStats()
```

---

### Feature 7: Workflow Automation Rules

**Requirement**: Create a rule engine for "when X happens, do Y" automation. Example: "When ticket priority = critical AND unassigned for 15 min → auto-escalate to queue X". Build on the existing NATS event system and escalation_rules table.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/029_automation_rules.sql`**

```sql
-- +goose Up
-- Migration 029: Workflow Automation Rules

CREATE TABLE automation_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    -- Trigger definition
    trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'condition')),
    -- event: fires on a specific domain event (e.g., "itsm.ticket.created")
    -- schedule: fires on a cron schedule (e.g., "*/15 * * * *")
    -- condition: fires when a condition becomes true (polled periodically)
    trigger_config  JSONB NOT NULL,
    -- {
    --   "event": "itsm.ticket.created",
    --   "filters": { "priority": ["critical", "high"], "type": ["incident"] }
    -- }
    -- OR: { "schedule": "*/15 * * * *" }
    -- OR: { "condition": "tickets.status = 'open' AND tickets.assigned_to IS NULL AND tickets.created_at < NOW() - INTERVAL '15 minutes'" }

    -- Condition (additional check before executing actions)
    condition_config JSONB DEFAULT '{}',
    -- {
    --   "field": "assigneeId",
    --   "operator": "is_null"
    -- }
    -- OR: {
    --   "all": [
    --     { "field": "priority", "operator": "eq", "value": "critical" },
    --     { "field": "age_minutes", "operator": "gt", "value": 15 }
    --   ]
    -- }

    -- Actions to execute when triggered + conditions met
    actions         JSONB NOT NULL DEFAULT '[]',
    -- [
    --   { "type": "update_field", "config": { "field": "status", "value": "escalated" } },
    --   { "type": "assign_queue", "config": { "queueId": "uuid" } },
    --   { "type": "send_notification", "config": { "template": "escalation_alert", "recipients": ["role:itsm_manager"] } },
    --   { "type": "start_approval", "config": { "workflowId": "uuid" } },
    --   { "type": "create_action_item", "config": { "title": "...", "ownerRole": "..." } },
    --   { "type": "webhook", "config": { "url": "...", "method": "POST", "headers": {} } }
    -- ]

    -- Execution limits
    max_executions_per_hour INT DEFAULT 100,
    cooldown_minutes        INT DEFAULT 0,  -- Minimum time between executions for the same entity

    -- Metadata
    execution_count INT NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX idx_automation_rules_active ON automation_rules(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger_type);

CREATE TRIGGER trg_automation_rules_updated
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Automation execution log
CREATE TABLE automation_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES automation_rules(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    trigger_event   JSONB,           -- The event/condition that triggered execution
    entity_type     TEXT,
    entity_id       UUID,
    actions_taken   JSONB NOT NULL,  -- Record of each action executed and its result
    status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
    error_message   TEXT,
    duration_ms     INT,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX idx_automation_executions_entity ON automation_executions(entity_type, entity_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status) WHERE status != 'success';
CREATE INDEX idx_automation_executions_date ON automation_executions(executed_at);
```

**B. Create Go backend** — `itd-opms-api/internal/modules/automation/`

**`types.go`** — Domain types:
```go
// TriggerType defines when a rule fires
type TriggerType string
const (
    TriggerEvent     TriggerType = "event"
    TriggerSchedule  TriggerType = "schedule"
    TriggerCondition TriggerType = "condition"
)

// ActionType defines what a rule does
type ActionType string
const (
    ActionUpdateField      ActionType = "update_field"
    ActionAssignQueue      ActionType = "assign_queue"
    ActionAssignUser       ActionType = "assign_user"
    ActionSendNotification ActionType = "send_notification"
    ActionStartApproval    ActionType = "start_approval"
    ActionCreateActionItem ActionType = "create_action_item"
    ActionWebhook          ActionType = "webhook"
    ActionEscalate         ActionType = "escalate"
    ActionSetPriority      ActionType = "set_priority"
    ActionAddTag           ActionType = "add_tag"
    ActionAddComment       ActionType = "add_comment"
)

// ConditionOperator for rule conditions
type ConditionOperator string
const (
    OpEquals      ConditionOperator = "eq"
    OpNotEquals   ConditionOperator = "neq"
    OpGreaterThan ConditionOperator = "gt"
    OpLessThan    ConditionOperator = "lt"
    OpContains    ConditionOperator = "contains"
    OpIsNull      ConditionOperator = "is_null"
    OpIsNotNull   ConditionOperator = "is_not_null"
    OpIn          ConditionOperator = "in"
)

type AutomationRule struct {
    ID                    uuid.UUID       `json:"id"`
    TenantID              uuid.UUID       `json:"tenantId"`
    Name                  string          `json:"name"`
    Description           string          `json:"description"`
    IsActive              bool            `json:"isActive"`
    TriggerType           TriggerType     `json:"triggerType"`
    TriggerConfig         json.RawMessage `json:"triggerConfig"`
    ConditionConfig       json.RawMessage `json:"conditionConfig"`
    Actions               json.RawMessage `json:"actions"`
    MaxExecutionsPerHour  int             `json:"maxExecutionsPerHour"`
    CooldownMinutes       int             `json:"cooldownMinutes"`
    ExecutionCount        int             `json:"executionCount"`
    LastExecutedAt        *time.Time      `json:"lastExecutedAt"`
    CreatedBy             uuid.UUID       `json:"createdBy"`
    CreatedAt             time.Time       `json:"createdAt"`
    UpdatedAt             time.Time       `json:"updatedAt"`
}

type AutomationExecution struct {
    ID           uuid.UUID       `json:"id"`
    RuleID       uuid.UUID       `json:"ruleId"`
    TenantID     uuid.UUID       `json:"tenantId"`
    TriggerEvent json.RawMessage `json:"triggerEvent"`
    EntityType   string          `json:"entityType"`
    EntityID     *uuid.UUID      `json:"entityId"`
    ActionsTaken json.RawMessage `json:"actionsTaken"`
    Status       string          `json:"status"`
    ErrorMessage string          `json:"errorMessage"`
    DurationMs   int             `json:"durationMs"`
    ExecutedAt   time.Time       `json:"executedAt"`
}
```

**`handler.go`** endpoints:
```
/api/v1/automation
  GET    /rules              — List automation rules (paginated)
  POST   /rules              — Create rule
  GET    /rules/{id}         — Get rule detail
  PUT    /rules/{id}         — Update rule
  DELETE /rules/{id}         — Delete rule
  POST   /rules/{id}/toggle  — Activate/deactivate rule
  POST   /rules/{id}/test    — Dry-run a rule against a sample entity
  GET    /rules/{id}/executions — List executions for a rule
  GET    /executions         — List all executions (paginated, filterable)
  GET    /stats              — Automation statistics (total rules, executions today, failures)
```

Permissions: `automation.view`, `automation.manage`

**`engine.go`** — Rule engine core:

The engine runs as a background service (registered in `server.go`):

```go
type AutomationEngine struct {
    pool       *pgxpool.Pool
    js         nats.JetStreamContext
    auditSvc   *audit.AuditService
    // References to other module services for executing actions
    ticketSvc  TicketUpdater    // Interface for updating tickets
    queueSvc   QueueAssigner    // Interface for queue assignment
    notifySvc  NotificationSender
}
```

1. **Event-triggered rules**: Subscribe to NATS subjects (`notify.>`) via JetStream consumer. When an event arrives:
   - Load all active rules with `trigger_type = 'event'` matching the event type
   - For each matching rule:
     - Evaluate `condition_config` against the entity's current state (fetch from DB)
     - Check rate limits (max_executions_per_hour, cooldown)
     - Execute each action in the `actions` array
     - Log execution in `automation_executions`

2. **Schedule-triggered rules**: Run a ticker that checks every minute for rules whose cron schedule matches the current time. Execute their conditions and actions.

3. **Condition-triggered rules**: Run a periodic check (every 5 minutes) that evaluates condition queries against the database. When conditions become true, execute actions.

**Action executors** (implement each action type):

```go
func (e *AutomationEngine) executeAction(ctx context.Context, action ActionDef, entity EntityContext) error {
    switch ActionType(action.Type) {
    case ActionUpdateField:
        // Update the entity's field in the database
    case ActionAssignQueue:
        // Assign ticket to specified queue
    case ActionSendNotification:
        // Publish to NATS notification subject
    case ActionStartApproval:
        // Call approval engine to start a chain
    case ActionEscalate:
        // Update ticket priority + reassign
    case ActionAddComment:
        // Add a system comment to the entity
    case ActionWebhook:
        // POST to external URL with entity data
    }
}
```

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/system/automation/page.tsx`** — Automation Rules Manager

1. **Summary cards**: Total Rules, Active Rules, Executions Today, Failures Today
2. **Rules table**: Name, Trigger Type, Entity Type, Status (active/inactive), Executions, Last Run, Actions
3. **Create/Edit rule form** (full-page or large modal):

   **Trigger section**:
   - Trigger type selector: Event / Schedule / Condition
   - **Event**: Event type dropdown (grouped by module: ITSM → ticket.created, ticket.updated, ticket.escalated; Planning → workitem.status_changed; etc.) + optional filter fields
   - **Schedule**: Cron expression builder with human-readable preview (e.g., "Every 15 minutes")
   - **Condition**: Entity type selector + condition builder (field, operator, value) with AND/OR grouping

   **Condition section** (optional additional filters):
   - Visual condition builder: "When [field] [operator] [value]" rows with add/remove
   - Combine with AND/OR
   - Preview as human-readable text: "When priority is critical AND assignee is empty AND age > 15 minutes"

   **Actions section**:
   - List of actions to execute (add multiple)
   - Each action: Type dropdown + configuration form specific to the type
   - Drag to reorder actions
   - Action types with their config forms:
     - Update Field: field picker + value input
     - Assign Queue: queue dropdown
     - Send Notification: template selector + recipient selector
     - Escalate: new priority + target queue/user
     - Add Comment: comment text
     - Start Approval: workflow definition selector
     - Webhook: URL, method, headers, body template

   **Settings section**: Max executions/hour, cooldown minutes

4. **Execution log**: Table of recent executions with: Rule, Entity, Actions Taken, Status, Duration, Time
5. **Test/dry-run**: Select a sample entity and see what the rule would do without actually executing

**Hooks: `itd-opms-portal/hooks/use-automation.ts`**:
```typescript
export function useAutomationRules(filters?: AutomationRuleFilters)
export function useAutomationRule(id: string)
export function useCreateAutomationRule()
export function useUpdateAutomationRule(id: string)
export function useDeleteAutomationRule(id: string)
export function useToggleAutomationRule(id: string)
export function useTestAutomationRule(id: string)
export function useAutomationExecutions(ruleId?: string, filters?: ExecutionFilters)
export function useAutomationStats()
```

---

### Feature 8: Custom Fields

**Requirement**: Allow tenants to define custom fields on any entity type, stored as JSONB. Provide a field definition UI, dynamic form rendering, and seamless integration with existing entity forms and tables.

#### What to Build:

**A. Create migration `itd-opms-api/migrations/030_custom_fields.sql`**

```sql
-- +goose Up
-- Migration 030: Custom Fields System

-- Custom field definitions (tenant-configurable)
CREATE TABLE custom_field_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    entity_type     TEXT NOT NULL,  -- 'ticket', 'project', 'work_item', 'asset', 'vendor', 'contract', 'risk', etc.
    field_key       TEXT NOT NULL,  -- Machine-readable key: "department_code", "cost_center"
    field_label     TEXT NOT NULL,  -- Display label: "Department Code"
    field_type      TEXT NOT NULL CHECK (field_type IN (
        'text', 'textarea', 'number', 'decimal', 'boolean',
        'date', 'datetime', 'select', 'multiselect',
        'url', 'email', 'phone', 'user_reference'
    )),
    description     TEXT,
    -- Configuration
    is_required     BOOLEAN NOT NULL DEFAULT false,
    is_filterable   BOOLEAN NOT NULL DEFAULT false,  -- Show in table filters
    is_visible_in_list BOOLEAN NOT NULL DEFAULT false,  -- Show as column in list views
    display_order   INT NOT NULL DEFAULT 0,
    -- Validation
    validation_rules JSONB DEFAULT '{}',
    -- { "min": 0, "max": 100 }               — for number
    -- { "minLength": 3, "maxLength": 255 }   — for text
    -- { "pattern": "^[A-Z]{3}-\\d{4}$" }     — regex pattern
    -- { "options": [{"value":"a","label":"Option A"}, ...] }  — for select/multiselect
    default_value   TEXT,
    -- Metadata
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, entity_type, field_key)
);

CREATE INDEX idx_custom_field_defs_tenant_entity ON custom_field_definitions(tenant_id, entity_type);
CREATE INDEX idx_custom_field_defs_active ON custom_field_definitions(tenant_id, entity_type, is_active) WHERE is_active = true;

CREATE TRIGGER trg_custom_field_defs_updated
    BEFORE UPDATE ON custom_field_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Ensure entities that don't already have a custom_fields JSONB column get one
-- (tickets already has custom_fields; add to others)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Note: assets already have metadata JSONB; we'll use custom_fields separately
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'custom_fields') THEN
        ALTER TABLE assets ADD COLUMN custom_fields JSONB DEFAULT '{}';
    END IF;
END$$;

-- GIN index for JSONB queries on custom_fields
CREATE INDEX IF NOT EXISTS idx_tickets_custom_fields ON tickets USING GIN (custom_fields) WHERE custom_fields IS NOT NULL AND custom_fields != '{}';
CREATE INDEX IF NOT EXISTS idx_projects_custom_fields ON projects USING GIN (custom_fields) WHERE custom_fields IS NOT NULL AND custom_fields != '{}';
CREATE INDEX IF NOT EXISTS idx_work_items_custom_fields ON work_items USING GIN (custom_fields) WHERE custom_fields IS NOT NULL AND custom_fields != '{}';
```

**B. Create Go backend** — `itd-opms-api/internal/modules/customfields/`

**`handler.go`** endpoints:
```
/api/v1/custom-fields
  GET    /definitions              — List field definitions (filterable by entity_type)
  POST   /definitions              — Create field definition
  GET    /definitions/{id}         — Get field definition
  PUT    /definitions/{id}         — Update field definition
  DELETE /definitions/{id}         — Deactivate field definition
  POST   /definitions/reorder      — Update display_order for multiple definitions
  GET    /entity/{type}/{id}/values  — Get custom field values for a specific entity
  PUT    /entity/{type}/{id}/values  — Update custom field values for a specific entity
```

Permissions: `custom_fields.manage` (for definitions), `{entity}.manage` (for values)

**`service.go`** — Custom fields logic:

```go
// ValidateCustomFields validates field values against their definitions
func (s *CustomFieldService) ValidateCustomFields(ctx context.Context, tenantID uuid.UUID, entityType string, values map[string]any) error {
    // 1. Load active field definitions for this entity type
    // 2. Check required fields are present
    // 3. Validate types (number is actually a number, email matches pattern, etc.)
    // 4. Validate against validation_rules (min/max, pattern, minLength/maxLength)
    // 5. For select/multiselect: check value is in allowed options
    // 6. Return validation errors
}

// GetFieldDefinitionsForEntity returns all active field definitions for an entity type
func (s *CustomFieldService) GetFieldDefinitionsForEntity(ctx context.Context, tenantID uuid.UUID, entityType string) ([]CustomFieldDefinition, error)

// GetCustomFieldValues reads the JSONB custom_fields from the entity's table
func (s *CustomFieldService) GetCustomFieldValues(ctx context.Context, tenantID uuid.UUID, entityType string, entityID uuid.UUID) (map[string]any, error)

// UpdateCustomFieldValues validates and writes the JSONB custom_fields on the entity's table
func (s *CustomFieldService) UpdateCustomFieldValues(ctx context.Context, tenantID uuid.UUID, entityType string, entityID uuid.UUID, values map[string]any) error
```

**Integration with existing entity endpoints:**

Modify existing create/update handlers for tickets, projects, work items, assets, etc. to:
1. Accept `customFields` in the request body (already present for tickets)
2. Call `ValidateCustomFields()` before saving
3. Store in the entity's `custom_fields` JSONB column
4. Return `customFields` in responses

**C. Create frontend**

**Page: `itd-opms-portal/app/dashboard/system/custom-fields/page.tsx`** — Custom Field Manager (admin)

1. **Entity type tabs**: Tickets, Projects, Work Items, Assets, Vendors, Contracts, Risks
2. **Field list per entity type**: Sortable list (drag to reorder) showing: Label, Key, Type, Required, Filterable, Visible in List, Actions
3. **Create/Edit field modal**:
   - Field label (auto-generates field_key from label as snake_case)
   - Field type dropdown with preview of what the input looks like
   - Required toggle
   - Filterable toggle, Visible in List toggle
   - Validation rules (conditional on type):
     - Text: min/max length, regex pattern
     - Number: min/max value
     - Select/Multiselect: Options list (add/remove/reorder)
   - Default value
   - Description (help text shown to users)
4. **Preview section**: Shows a mock form with the custom field rendered

**Component: `itd-opms-portal/components/shared/custom-fields-form.tsx`** — Dynamic form renderer

```typescript
interface CustomFieldsFormProps {
  entityType: string;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  readOnly?: boolean;
}

// Renders custom fields dynamically based on field definitions
export function CustomFieldsForm({ entityType, values, onChange, readOnly }: CustomFieldsFormProps) {
  const { data: definitions } = useCustomFieldDefinitions(entityType);

  return (
    <div className="space-y-4">
      {definitions?.filter(d => d.isActive).sort((a,b) => a.displayOrder - b.displayOrder).map(field => (
        <CustomFieldInput key={field.id} definition={field} value={values[field.fieldKey]} onChange={...} readOnly={readOnly} />
      ))}
    </div>
  );
}
```

**`CustomFieldInput`** renders the appropriate input based on `field_type`:
- `text` → `<input type="text">`
- `textarea` → `<textarea>`
- `number`/`decimal` → `<input type="number">`
- `boolean` → toggle switch
- `date`/`datetime` → `<input type="date/datetime-local">`
- `select` → `<select>` with options from `validation_rules.options`
- `multiselect` → Multi-checkbox or tag input
- `url`/`email`/`phone` → typed `<input>` with appropriate validation
- `user_reference` → User picker (search users by name)

**Integration into existing forms:**

Add `<CustomFieldsForm>` section to existing create/edit forms:
- Ticket create/edit form (already has `custom_fields` in DB)
- Project create/edit form
- Work item create/edit form
- Asset create/edit form
- Vendor create/edit form

Render custom fields in a "Custom Fields" section below the standard fields. Also add custom field columns to DataTable list views when `is_visible_in_list` is true.

**Component: `itd-opms-portal/components/shared/custom-field-columns.tsx`** — Dynamic table columns

```typescript
// Returns Column<T>[] definitions for custom fields that are visible in list views
export function useCustomFieldColumns<T extends { customFields?: Record<string, any> }>(entityType: string): Column<T>[] {
  const { data: definitions } = useCustomFieldDefinitions(entityType);
  return (definitions || [])
    .filter(d => d.isVisibleInList && d.isActive)
    .map(field => ({
      key: `cf_${field.fieldKey}`,
      header: field.fieldLabel,
      sortable: false,
      render: (item: T) => formatCustomFieldValue(field, item.customFields?.[field.fieldKey]),
    }));
}
```

Use this in list pages to append custom field columns after the standard columns:
```typescript
const standardColumns: Column<Ticket>[] = [...];
const customColumns = useCustomFieldColumns<Ticket>("ticket");
const allColumns = [...standardColumns, ...customColumns];
```

**Hooks: `itd-opms-portal/hooks/use-custom-fields.ts`**:
```typescript
export function useCustomFieldDefinitions(entityType: string)
export function useCustomFieldDefinition(id: string)
export function useCreateCustomFieldDefinition()
export function useUpdateCustomFieldDefinition(id: string)
export function useDeleteCustomFieldDefinition(id: string)
export function useReorderCustomFieldDefinitions(entityType: string)
export function useCustomFieldValues(entityType: string, entityId: string)
export function useUpdateCustomFieldValues(entityType: string, entityId: string)
```

---

## File Summary

### New Files to Create:

| # | File | Purpose | Est. Lines |
|---|------|---------|------------|
| 1 | `migrations/024_approval_engine_enhancements.sql` | Approval table enhancements | ~40 |
| 2 | `migrations/025_change_calendar.sql` | Maintenance windows + freeze periods | ~60 |
| 3 | `migrations/026_budget_tracking.sql` | Cost entries, categories, snapshots | ~75 |
| 4 | `migrations/027_vendor_management.sql` | Vendors, contracts, scorecards, renewals | ~120 |
| 5 | `migrations/028_document_vault.sql` | Folders, doc enhancements, access log, shares | ~80 |
| 6 | `migrations/029_automation_rules.sql` | Automation rules + execution log | ~80 |
| 7 | `migrations/030_custom_fields.sql` | Field definitions + entity column additions | ~60 |
| 8 | `internal/modules/approval/handler.go` | Approval HTTP handlers | ~300 |
| 9 | `internal/modules/approval/service.go` | Approval engine core logic | ~500 |
| 10 | `internal/modules/approval/types.go` | Approval domain types | ~200 |
| 11 | `internal/modules/calendar/handler.go` | Calendar HTTP handlers | ~200 |
| 12 | `internal/modules/calendar/service.go` | Calendar aggregation service | ~350 |
| 13 | `internal/modules/calendar/types.go` | Calendar types | ~80 |
| 14 | `internal/modules/planning/budget_handler.go` | Budget/cost HTTP handlers | ~250 |
| 15 | `internal/modules/planning/budget_service.go` | Budget service | ~400 |
| 16 | `internal/modules/vendor/handler.go` | Vendor/contract HTTP handlers | ~350 |
| 17 | `internal/modules/vendor/service.go` | Vendor service | ~500 |
| 18 | `internal/modules/vendor/types.go` | Vendor domain types | ~200 |
| 19 | `internal/modules/vault/handler.go` | Document vault HTTP handlers | ~350 |
| 20 | `internal/modules/vault/service.go` | Document vault service (extends doc service) | ~600 |
| 21 | `internal/modules/vault/types.go` | Vault types | ~120 |
| 22 | `internal/modules/automation/handler.go` | Automation rule HTTP handlers | ~200 |
| 23 | `internal/modules/automation/engine.go` | Rule engine core + NATS subscriber | ~500 |
| 24 | `internal/modules/automation/types.go` | Automation types | ~150 |
| 25 | `internal/modules/customfields/handler.go` | Custom field HTTP handlers | ~200 |
| 26 | `internal/modules/customfields/service.go` | Custom field validation + CRUD | ~300 |
| 27 | `internal/modules/customfields/types.go` | Custom field types | ~100 |
| 28 | `queries/approval.sql` | Approval SQL queries | ~120 |
| 29 | `queries/calendar.sql` | Calendar SQL queries | ~80 |
| 30 | `queries/budget.sql` | Budget SQL queries | ~100 |
| 31 | `queries/vendor.sql` | Vendor/contract SQL queries | ~150 |
| 32 | `queries/vault.sql` | Document vault SQL queries | ~100 |
| 33 | `queries/automation.sql` | Automation SQL queries | ~80 |
| 34 | `queries/custom_fields.sql` | Custom field SQL queries | ~60 |
| 35 | `portal/app/dashboard/governance/approvals/page.tsx` | My Approvals queue | ~350 |
| 36 | `portal/app/dashboard/system/workflows/page.tsx` | Workflow definition manager | ~400 |
| 37 | `portal/components/shared/approval-status.tsx` | Reusable approval status widget | ~250 |
| 38 | `portal/hooks/use-approvals.ts` | Approval hooks | ~200 |
| 39 | `portal/app/dashboard/planning/calendar/page.tsx` | Change calendar | ~600 |
| 40 | `portal/hooks/use-calendar.ts` | Calendar hooks | ~100 |
| 41 | `portal/app/dashboard/people/capacity/heatmap/page.tsx` | Resource heatmap | ~400 |
| 42 | `portal/app/dashboard/planning/projects/[id]/budget/page.tsx` | Project budget dashboard | ~450 |
| 43 | `portal/app/dashboard/planning/budget/page.tsx` | Portfolio budget overview | ~300 |
| 44 | `portal/hooks/use-budget.ts` | Budget hooks | ~150 |
| 45 | `portal/app/dashboard/cmdb/vendors/page.tsx` | Vendor registry | ~350 |
| 46 | `portal/app/dashboard/cmdb/vendors/[id]/page.tsx` | Vendor detail (tabs) | ~500 |
| 47 | `portal/app/dashboard/cmdb/contracts/page.tsx` | Contract dashboard | ~350 |
| 48 | `portal/hooks/use-vendors.ts` | Vendor/contract hooks | ~200 |
| 49 | `portal/app/dashboard/vault/page.tsx` | Document vault | ~600 |
| 50 | `portal/components/shared/document-upload.tsx` | Reusable drag-drop upload component | ~200 |
| 51 | `portal/hooks/use-vault.ts` | Document vault hooks | ~200 |
| 52 | `portal/app/dashboard/system/automation/page.tsx` | Automation rules manager | ~500 |
| 53 | `portal/hooks/use-automation.ts` | Automation hooks | ~100 |
| 54 | `portal/app/dashboard/system/custom-fields/page.tsx` | Custom field manager | ~400 |
| 55 | `portal/components/shared/custom-fields-form.tsx` | Dynamic custom field form renderer | ~300 |
| 56 | `portal/components/shared/custom-field-columns.tsx` | Dynamic table columns for custom fields | ~80 |
| 57 | `portal/hooks/use-custom-fields.ts` | Custom field hooks | ~100 |

### Files to Modify:

| # | File | Changes |
|---|------|---------|
| 1 | `server.go` | Register approval, calendar, vendor, vault, automation, customfields modules + routes |
| 2 | `sidebar.tsx` | Add nav items: Approvals, Calendar, Budget, Vendors/Contracts, Document Vault, Automation, Custom Fields |
| 3 | `planning/change-requests/[id]/page.tsx` | Integrate `<ApprovalStatus>` widget |
| 4 | `governance/policies/[slug]/page.tsx` | Integrate `<ApprovalStatus>` widget |
| 5 | `cmdb/assets/[id]/page.tsx` | Integrate `<ApprovalStatus>` for disposal workflow |
| 6 | `itsm/tickets/new/page.tsx` | Add `<CustomFieldsForm>` section |
| 7 | `itsm/tickets/[id]/page.tsx` | Show custom field values, inline editing |
| 8 | `planning/projects/new/page.tsx` | Add `<CustomFieldsForm>` section |
| 9 | `planning/projects/[id]/page.tsx` | Add Budget tab link, show custom fields |
| 10 | `cmdb/assets/new/page.tsx` or equivalent | Add `<CustomFieldsForm>` section |
| 11 | `itsm/tickets/page.tsx` | Add custom field columns from `useCustomFieldColumns` |
| 12 | `planning/projects/page.tsx` | Add custom field columns |
| 13 | `people/capacity/page.tsx` | Add link/tab for heatmap view |
| 14 | `header.tsx` | Add pending approval count badge (from `useMyPendingApprovalCount`) |
| 15 | `itsm/ticket_handler.go` | Call `ValidateCustomFields` on create/update |
| 16 | `planning/project_handler.go` | Call `ValidateCustomFields` on create/update |
| 17 | `hooks/use-itsm.ts` | Update ticket create/update mutations for custom_fields |
| 18 | `hooks/use-planning.ts` | Update project/work-item mutations for custom_fields |
| 19 | `types/index.ts` | Add TypeScript interfaces for all new entities |
| 20 | `lib/navigation.ts` (or `sidebar.tsx`) | Add nav items for new pages |

---

## Implementation Order (Recommended)

Implement in this dependency order:

1. **Custom Fields** (Feature 8) — Foundation layer. Other features can optionally use custom fields. No dependencies on other new features.

2. **Approval Workflow Engine** (Feature 1) — Core infrastructure. Vendor contracts and automation rules can trigger approval chains.

3. **Document Vault** (Feature 6) — Extends existing MinIO/documents infrastructure. Budget entries and contracts can link documents. Vendors can store contract documents.

4. **Budget & Cost Tracking** (Feature 4) — Standalone enhancement to planning module. Can link to documents from the vault.

5. **Vendor/Contract Management** (Feature 5) — Uses approval engine for contract approvals, links to document vault for contract documents.

6. **Change Calendar** (Feature 2) — Aggregates from ITSM + Planning. No dependencies on other new features but benefits from having approval workflow integrated.

7. **Resource Heatmap** (Feature 3) — Extends existing capacity allocations. Pure analytics/visualization layer.

8. **Workflow Automation** (Feature 7) — Last because it can trigger actions in all other modules (approval chains, notifications, field updates). Benefits from having all other features available as action targets.

---

## Parallelization Strategy

These features can be split across **4 parallel agents**:

| Agent | Features | Key Files |
|-------|----------|-----------|
| **Agent A** | Custom Fields + Approval Engine | Migrations 024, 030; modules: `customfields/`, `approval/`; frontend: custom-fields form, approval queue, workflow manager, approval status widget |
| **Agent B** | Document Vault + Budget Tracking | Migrations 026, 028; modules: `vault/`, `planning/budget_*`; frontend: vault page, upload component, budget dashboard |
| **Agent C** | Vendor Management + Change Calendar | Migrations 025, 027; modules: `vendor/`, `calendar/`; frontend: vendor pages, contracts page, calendar page |
| **Agent D** | Resource Heatmap + Workflow Automation | Migration 029; modules: `automation/`; frontend: heatmap page, automation rules page; people capacity endpoint enhancements |

**Dependency notes**:
- Agent A should complete custom fields first (other agents may reference `custom_fields` JSONB columns)
- Agent A's approval engine should complete before Agent C's vendor contracts (contracts use approval chains)
- Agent B's vault should be ready before Agent C's vendor documents
- Agent D's automation engine should be built last as it references other modules

**Recommended execution order**:
1. Start Agent A (custom fields first, then approval engine)
2. Start Agent B (vault first, then budget) — can run in parallel with Agent A
3. Start Agent C after Agent A completes approval engine
4. Start Agent D after all others (automation references all modules)

---

## Verification Plan

1. **TypeScript**: `cd itd-opms-portal && npx tsc --noEmit` — zero errors
2. **Go build**: `cd itd-opms-api && go build ./... && go vet ./...` — zero errors
3. **Migrations**: All SQL files valid, execute without errors in order
4. **Approval Engine**: Create a workflow definition for "change_request" → Start approval on a change request → Approve step 1 → Auto-advance to step 2 → Approve → Chain status = "approved" → Change request auto-transitions to "approved"
5. **Change Calendar**: View month calendar → See maintenance windows, milestones, change requests → Create new maintenance window → Conflict warning if overlapping → Freeze period blocks the date range
6. **Resource Heatmap**: View heatmap grouped by user → Hover cell shows project breakdown → Over-allocated users highlighted in red → Toggle week/month granularity
7. **Budget Tracking**: Navigate to project → Budget tab → Add cost entries → See burn rate chart update → Budget variance percentage updates → Export cost report
8. **Vendor Management**: Create vendor → Add contract with SLA terms → Create performance scorecard → View radar chart → Contract expiring alert appears → Initiate renewal
9. **Document Vault**: Navigate to vault → Create folder → Upload document (drag-drop) → Upload new version → View version history → Lock document → Download via presigned URL → Search by title/tags
10. **Workflow Automation**: Create rule: "When ticket.created AND priority = critical → assign to queue 'Critical Team'" → Create a critical ticket → Verify auto-assignment → Check execution log
11. **Custom Fields**: Define a "cost_center" text field for tickets → Create a ticket → Custom field appears in form → Fill in → Verify stored in DB → Verify shown in ticket detail → Verify shown as table column
12. **All existing functionality unaffected** — no regressions to existing pages/endpoints

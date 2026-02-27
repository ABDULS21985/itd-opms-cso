# PROMPT 11: Requirements Gap Closure — RACI Coverage, Overdue Actions Dashboard, Gantt Timeline & Post-Implementation Reviews

> **Requirements**: FR-A010, FR-A014, FR-C009, FR-C016
> **Priority**: Should (all four are important for full value delivery)
> **Domains**: A (Governance) + C (Planning/PMO)
> **Estimated Files**: ~15 backend + ~8 frontend

---

## Context & Architecture

You are a senior full-stack engineer working on ITD-OPMS (Operations & Performance Management System) for the Central Bank of Nigeria's IT Department. The system is already built and running — all 10 implementation phases are complete. You are now closing requirements gaps identified during an audit against the Architecture Requirements Specification V2.

**Tech Stack (already established — do NOT change):**
- Backend: Go modular monolith at `itd-opms-api/` (module: `github.com/itd-cbn/itd-opms-api`)
- Frontend: Next.js 16 + React 19 + TypeScript at `itd-opms-portal/`
- DB: PostgreSQL 16, pgx/v5 driver, goose/v3 migrations
- Router: chi/v5 with middleware chain
- UI: Tailwind 4, Framer Motion 12, Lucide icons, Recharts 2.15, Sonner toasts
- State: TanStack Query 5 for server state
- Auth: Dual-mode (Entra ID OIDC + dev JWT), RBAC with 7 roles
- Notifications: NATS JetStream → outbox → email/Teams/in-app via notification orchestrator
- CSS Variables: `var(--primary)`, `var(--surface-0)`, `var(--border)`, `var(--text-primary)`, `var(--neutral-gray)`, `var(--error)`, `var(--secondary)`, `var(--surface-1)`, `var(--surface-2)`, `var(--text-secondary)`

**Critical Patterns (follow exactly):**
- Response envelope: `types.OK(w, data, meta)`, `types.ErrorMessage(w, status, code, msg)`
- Pagination: `types.ParsePagination(r)` → page, limit; `types.NewMeta(total, pagination)`
- Auth context: `types.GetAuthContext(r.Context())` → `auth.UserID`, `auth.TenantID`, `auth.Roles`
- Middleware: `middleware.RequirePermission("governance.manage")` or `"planning.manage"`
- Audit: `auditSvc.Log(ctx, audit.AuditEntry{...})` for all mutations
- Frontend hooks: TanStack Query `useQuery`/`useMutation` with `apiClient.get`/`apiClient.post`/etc. from `@/lib/api-client`
- Toast: `toast.success("...")`, `toast.error("...")`
- Query invalidation: `queryClient.invalidateQueries({ queryKey: [...] })` on mutation success

---

## YOUR TASK — Implement 4 Requirements

### 1. FR-A010: RACI Coverage Reports Showing Unassigned Responsibilities (SHOULD)

**Requirement**: "The system shall provide RACI coverage reports showing unassigned responsibilities."
**Acceptance Criteria**: "Report identifies gaps in RACI coverage."

#### What Exists:
- `raci_matrices` table with `raci_entries` (matrix_id, activity, responsible_ids UUID[], accountable_id UUID, consulted_ids UUID[], informed_ids UUID[])
- `RACIService` at `itd-opms-api/internal/modules/governance/raci_service.go` with full CRUD
- Handler route `GET /governance/raci/{id}/coverage` exists but returns only basic total/assigned counts
- Frontend hooks: `useRACIMatrices()`, `useRACIMatrix(id)`, etc. in `itd-opms-portal/hooks/use-governance.ts`
- Frontend RACI detail page: `itd-opms-portal/app/dashboard/governance/raci/[id]/page.tsx`

#### What to Build:

**Backend** — Enhance the coverage report in `raci_service.go`:

Add a new `GetCoverageReport(ctx, matrixID)` method (or enhance existing) that returns:
```go
type RACICoverageReport struct {
    MatrixID        uuid.UUID                `json:"matrixId"`
    MatrixTitle     string                   `json:"matrixTitle"`
    TotalActivities int                      `json:"totalActivities"`
    FullyCovered    int                      `json:"fullyCovered"`      // All 4 roles assigned
    PartiallyCovered int                     `json:"partiallyCovered"`  // Some roles assigned
    Uncovered       int                      `json:"uncovered"`         // Missing Responsible or Accountable
    CoveragePct     float64                  `json:"coveragePct"`       // % fully covered
    Gaps            []RACIGap                `json:"gaps"`              // Specific gap details
    RoleSummary     RACIRoleSummary          `json:"roleSummary"`       // Aggregate per-role stats
}

type RACIGap struct {
    EntryID      uuid.UUID `json:"entryId"`
    Activity     string    `json:"activity"`
    MissingRoles []string  `json:"missingRoles"` // e.g., ["responsible", "consulted"]
}

type RACIRoleSummary struct {
    ResponsibleAssigned int `json:"responsibleAssigned"`
    AccountableAssigned int `json:"accountableAssigned"`
    ConsultedAssigned   int `json:"consultedAssigned"`
    InformedAssigned    int `json:"informedAssigned"`
    TotalEntries        int `json:"totalEntries"`
}
```

Logic: For each entry, check if `responsible_ids` is empty (gap), if `consulted_ids` is empty (gap), if `informed_ids` is empty (gap). `accountable_id` is always required so it should never be empty. "Fully covered" means all 4 roles have at least one assignment.

Also add a **tenant-wide coverage summary** endpoint:
- `GET /api/v1/governance/raci/coverage-summary` — Returns aggregate coverage across all active matrices for the tenant (total matrices, avg coverage %, matrices with gaps, top uncovered activities).

**Handler** — Add routes in `raci_handler.go`:
- Enhance existing `GET /governance/raci/{id}/coverage` to return the full `RACICoverageReport`
- Add `GET /governance/raci/coverage-summary` for tenant-wide view

**Frontend** — Add coverage report UI:

Add a new hook `useRACICoverageReport(matrixId)` and `useRACICoverageSummary()` in `use-governance.ts`.

Enhance the RACI detail page (`raci/[id]/page.tsx`) to add a "Coverage" tab/section showing:
- Coverage percentage donut/progress ring
- Gap list with activity name and missing roles highlighted in red
- Role summary bar chart (R/A/C/I assigned counts)

Add a **RACI Coverage Dashboard** widget to the governance dashboard page (`governance/page.tsx`) showing:
- Aggregate coverage % across all matrices
- Count of matrices with gaps
- Quick link to matrices needing attention

---

### 2. FR-A014: Overdue Action Item Dashboard with Automated Reminders (SHOULD)

**Requirement**: "The system shall provide overdue action item dashboards and automated reminder notifications."
**Acceptance Criteria**: "Overdue actions flagged with reminders sent."

#### What Exists:
- `action_items` table with `owner_id`, `due_date`, `status`, `priority`
- Index: `idx_action_items_overdue ON action_items(status, due_date) WHERE status IN ('open', 'in_progress')`
- `MeetingService.ListOverdueActions()` in `meeting_service.go` — returns overdue items
- Frontend hook: `useOverdueActions()` in `use-governance.ts`
- Action items tab on meetings page with basic overdue indicator (⚠️ icon)
- Notification orchestrator at `itd-opms-api/internal/platform/notification/orchestrator.go` with NATS event routing

#### What to Build:

**Backend — Overdue Actions Service Enhancements** in `meeting_service.go`:

Add these methods:
```go
// GetOverdueActionStats returns overdue action statistics for the tenant dashboard.
GetOverdueActionStats(ctx, tenantID) → OverdueStats {
    TotalOverdue     int
    OverdueByCriticality map[string]int  // critical: 3, high: 5, medium: 12, low: 2
    OverdueByOwner   []OwnerOverdueCount // [{OwnerID, OwnerName, Count}]
    OldestOverdue    *time.Time
    AvgDaysOverdue   float64
}

// GetOverdueActionsByOwner returns overdue items for a specific user (for "My Overdue Actions").
GetOverdueActionsByOwner(ctx, tenantID, ownerID) → []ActionItem
```

**Backend — Automated Reminder Cron Job**:

Create `itd-opms-api/internal/modules/governance/action_reminder.go`:
```go
type ActionReminderService struct {
    pool     *pgxpool.Pool
    js       nats.JetStreamContext  // For publishing domain events
}

// RunReminders should be called periodically (e.g., every hour from main.go via a goroutine ticker).
// It checks for:
// 1. Actions due within 24 hours (approaching deadline)
// 2. Actions 1 day overdue (first reminder)
// 3. Actions 3 days overdue (escalation reminder)
// 4. Actions 7+ days overdue (critical reminder to owner + their manager)
//
// For each qualifying action, publish a NATS domain event:
//   Subject: notify.governance.action_overdue
//   Data: { actionId, title, ownerName, dueDate, daysOverdue, priority, actionUrl }
//
// Track which reminders have been sent by storing last_reminder_sent TIMESTAMPTZ
// and reminder_count INT on the action_items table (add via migration).
```

**Migration** — Create `itd-opms-api/migrations/019_action_reminders.sql`:
```sql
-- +goose Up
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;

-- +goose Down
ALTER TABLE action_items DROP COLUMN IF EXISTS last_reminder_sent;
ALTER TABLE action_items DROP COLUMN IF EXISTS reminder_count;
```

**Notification Config** — Add to `orchestrator.go` in `resolveNotificationConfig`:
```go
"governance.action_due_soon": {
    EmailTemplate: "action_due_reminder",
    Channels:      []string{"email", "in_app"},
    Priority:      5,
},
"governance.action_overdue": {
    EmailTemplate: "action_overdue_reminder",
    Channels:      []string{"email", "teams", "in_app"},
    Priority:      7,
},
"governance.action_critical_overdue": {
    EmailTemplate: "action_critical_overdue",
    TeamsTemplate: "teams_action_overdue_card",
    Channels:      []string{"email", "teams", "in_app"},
    Priority:      9,
},
```

**Main.go Integration** — Wire the reminder goroutine in `cmd/api/main.go`:
```go
// Start action reminder cron (every hour)
reminderSvc := governance.NewActionReminderService(pool, js)
go func() {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()
    for {
        select {
        case <-ticker.C:
            reminderSvc.RunReminders(context.Background(), tenantID)
        case <-ctx.Done():
            return
        }
    }
}()
```

**Handler** — Add routes in `meeting_handler.go`:
- `GET /governance/meetings/actions/overdue/stats` → `GetOverdueActionStats`
- `GET /governance/meetings/actions/overdue/mine` → `GetOverdueActionsByOwner` (uses auth.UserID)

**Frontend — Dedicated Overdue Actions Dashboard**:

Create `itd-opms-portal/app/dashboard/governance/actions/page.tsx`:

This is a dedicated "Action Tracker" page with:
- **Summary cards at top**: Total Overdue (red), Due This Week (amber), Approaching Deadline (yellow), Completed This Month (green)
- **Filter bar**: Status (all/open/in_progress/overdue), Priority, Owner (searchable dropdown), Date range
- **Data table**: Title, Source (meeting/decision/OKR with link), Owner (avatar+name), Due Date (with days overdue badge in red), Priority badge, Status badge, Actions (complete/edit)
- **Overdue Heatmap**: Small bar chart showing overdue count by priority (Recharts BarChart)
- **"My Actions" toggle**: Filter to show only the logged-in user's items

Add hooks in `use-governance.ts`:
```typescript
useOverdueActionStats()   // GET /governance/meetings/actions/overdue/stats
useMyOverdueActions()     // GET /governance/meetings/actions/overdue/mine
```

Add a sidebar navigation entry under Governance group: "Action Tracker" with `ListChecks` icon (Lucide), permission `governance.view`.

---

### 3. FR-C009: Gantt-Style Timeline Views for Project Schedules (SHOULD)

**Requirement**: "The system shall provide Gantt-style or timeline views for project schedules."
**Acceptance Criteria**: "Visual timeline rendered for project schedule."

#### What Exists:
- Projects have `planned_start DATE`, `planned_end DATE`, `actual_start`, `actual_end`, `completion_pct`
- Work items have `due_date DATE`, `completed_at TIMESTAMPTZ`, `parent_id` (hierarchy), `estimated_hours`, `actual_hours`, `status`
- Milestones have `target_date DATE`, `actual_date`, `status` (pending/completed/missed)
- Dependencies: `project_dependencies` with `dependency_type` (finish_to_start, start_to_start, etc.)
- Hooks: `useProject(id)`, `useMilestones(projectId)`, `useWBSTree(projectId)`, `useWorkItems(...)`, `useProjectDependencies(projectId)`
- Recharts 2.15 already installed
- Project detail page at `itd-opms-portal/app/dashboard/planning/projects/[id]/page.tsx`

#### What to Build:

**Backend** — Add a consolidated timeline endpoint in `workitem_service.go` or a new file:

Create `itd-opms-api/internal/modules/planning/timeline_service.go`:
```go
type TimelineService struct {
    pool     *pgxpool.Pool
    auditSvc *audit.AuditService
}

type ProjectTimeline struct {
    Project      ProjectSummary        `json:"project"`
    Milestones   []MilestoneTimeline   `json:"milestones"`
    WorkItems    []WorkItemTimeline    `json:"workItems"`
    Dependencies []DependencyTimeline  `json:"dependencies"`
}

type ProjectSummary struct {
    ID            uuid.UUID `json:"id"`
    Title         string    `json:"title"`
    PlannedStart  *string   `json:"plannedStart"`   // DATE as string
    PlannedEnd    *string   `json:"plannedEnd"`
    ActualStart   *string   `json:"actualStart"`
    ActualEnd     *string   `json:"actualEnd"`
    CompletionPct float64   `json:"completionPct"`
    Status        string    `json:"status"`
    RAGStatus     string    `json:"ragStatus"`
}

type MilestoneTimeline struct {
    ID         uuid.UUID `json:"id"`
    Title      string    `json:"title"`
    TargetDate string    `json:"targetDate"`
    ActualDate *string   `json:"actualDate"`
    Status     string    `json:"status"`
}

type WorkItemTimeline struct {
    ID             uuid.UUID  `json:"id"`
    Title          string     `json:"title"`
    Type           string     `json:"type"`      // epic, story, task, subtask
    ParentID       *uuid.UUID `json:"parentId"`
    Status         string     `json:"status"`
    Priority       string     `json:"priority"`
    DueDate        *string    `json:"dueDate"`
    CompletedAt    *string    `json:"completedAt"`
    EstimatedHours *float64   `json:"estimatedHours"`
    ActualHours    *float64   `json:"actualHours"`
    AssigneeName   *string    `json:"assigneeName"`
    SortOrder      int        `json:"sortOrder"`
}

type DependencyTimeline struct {
    FromProjectID uuid.UUID `json:"fromProjectId"`
    ToProjectID   uuid.UUID `json:"toProjectId"`
    Type          string    `json:"type"`
}

// GetProjectTimeline fetches all timeline data for a project in a single call.
// This reduces frontend round-trips from 4 separate requests to 1.
func (s *TimelineService) GetProjectTimeline(ctx context.Context, projectID uuid.UUID) (*ProjectTimeline, error)
```

Query should JOIN `users` on `assignee_id` to get `assignee_name` for display. Order work items by `sort_order, created_at`.

**Handler** — Add route in `handler.go`:
- `GET /planning/projects/{id}/timeline` → `GetProjectTimeline`

Also add a portfolio-level timeline:
- `GET /planning/portfolios/{id}/timeline` → Returns all projects in the portfolio with their `planned_start`, `planned_end`, `completion_pct`, `status`, `rag_status` for a portfolio Gantt.

**Frontend — Gantt Chart Component**:

Create `itd-opms-portal/components/planning/gantt-chart.tsx`:

Build a custom Gantt chart using **Recharts `BarChart`** with horizontal bars (this is the cleanest approach without adding new dependencies):

```typescript
// GanttChart props:
interface GanttChartProps {
  items: GanttItem[];
  milestones?: GanttMilestone[];
  startDate: Date;
  endDate: Date;
  onItemClick?: (id: string) => void;
}

interface GanttItem {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;       // 0-100
  type: "project" | "epic" | "task" | "milestone";
  status: string;
  parentId?: string;
  level: number;          // Indentation level
  color?: string;
}
```

Implementation approach:
1. Use a **horizontal stacked BarChart** from Recharts with `layout="vertical"`
2. Each row = a work item or milestone
3. X-axis = date range (project planned_start to planned_end)
4. Two overlapping bars per row: planned (light) and actual/progress (dark)
5. Milestone markers as diamond shapes (◆) on the timeline
6. Color code by status: green (done), blue (in_progress), amber (blocked/at risk), gray (todo)
7. Hover tooltip showing: name, dates, progress %, assignee, hours (estimated vs actual)
8. Click to navigate to work item detail
9. Collapsible row groups for epics → stories → tasks (using the parent_id hierarchy)

Alternatively, if horizontal Recharts bars prove awkward, build a simpler **custom SVG timeline**:
- Each row is a horizontal bar positioned by date offset
- Milestones are diamond markers
- CSS variables for theming
- Responsive container

**Frontend — Gantt Page**:

Create `itd-opms-portal/app/dashboard/planning/projects/[id]/timeline/page.tsx`:
- Fetch project timeline via `useProjectTimeline(projectId)` hook
- Render GanttChart with work items as bars, milestones as markers
- Controls: zoom level (week/month/quarter), expand/collapse groups, filter by status/assignee
- Breadcrumbs: Planning → Projects → {Project Name} → Timeline

Also add a tab/link on the project detail page (`projects/[id]/page.tsx`) to navigate to the timeline view.

**Portfolio Gantt**:

Create `itd-opms-portal/app/dashboard/planning/portfolios/[id]/timeline/page.tsx`:
- Shows all projects in the portfolio as horizontal bars
- Each bar = project (planned_start → planned_end)
- Progress fill within each bar
- RAG status color coding
- Milestones as markers
- Hook: `usePortfolioTimeline(portfolioId)`

Add hooks in `use-planning.ts`:
```typescript
useProjectTimeline(projectId)    // GET /planning/projects/{id}/timeline
usePortfolioTimeline(portfolioId) // GET /planning/portfolios/{id}/timeline
```

---

### 4. FR-C016: Post-Implementation Reviews (PIR) with Structured Templates (SHOULD)

**Requirement**: "The system shall support Post-Implementation Reviews (PIR) with structured templates and lesson capture."
**Acceptance Criteria**: "PIR completed with lessons captured and shared."

#### What Exists:
- Projects table with status lifecycle (proposed → approved → active → completed)
- Projects have `actual_end DATE` which marks project completion
- Audit service for logging all mutations
- Notification orchestrator for sending alerts
- Meeting module (can reference for structured review patterns)

#### What to Build:

**Migration** — Create `itd-opms-api/migrations/020_post_implementation_reviews.sql`:

```sql
-- +goose Up

-- PIR review entity
CREATE TABLE post_implementation_reviews (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(id),
    project_id         UUID NOT NULL REFERENCES projects(id),
    title              TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'draft',  -- draft, in_progress, completed, cancelled
    review_type        TEXT NOT NULL DEFAULT 'project', -- project, major_incident, change_request
    source_type        TEXT,           -- 'project', 'ticket', 'change_request'
    source_id          UUID,           -- FK to source entity
    scheduled_date     DATE,
    completed_date     DATE,
    facilitator_id     UUID REFERENCES users(id),

    -- Structured review sections
    objectives_met     TEXT,           -- Were project objectives achieved?
    scope_adherence    TEXT,           -- Was scope managed effectively?
    timeline_adherence TEXT,           -- Delivered on time?
    budget_adherence   TEXT,           -- Within budget?
    quality_assessment TEXT,           -- Quality of deliverables?
    stakeholder_satisfaction TEXT,     -- Stakeholder feedback summary

    -- What went well / what didn't
    successes          JSONB DEFAULT '[]',  -- [{description, category, impact}]
    challenges         JSONB DEFAULT '[]',  -- [{description, category, rootCause, impact}]
    lessons_learned    JSONB DEFAULT '[]',  -- [{description, category, recommendation, applicability}]

    -- Recommendations and follow-ups
    recommendations    JSONB DEFAULT '[]',  -- [{description, owner, priority, dueDate, status}]

    -- Scores (1-5 scale)
    overall_score      INT CHECK (overall_score BETWEEN 1 AND 5),

    -- Participants
    participants       UUID[] DEFAULT '{}',  -- Array of user IDs who attended

    -- Evidence
    evidence_refs      UUID[] DEFAULT '{}',  -- References to evidence/documents

    created_by         UUID NOT NULL REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pir_tenant ON post_implementation_reviews(tenant_id);
CREATE INDEX idx_pir_project ON post_implementation_reviews(project_id);
CREATE INDEX idx_pir_status ON post_implementation_reviews(tenant_id, status);
CREATE INDEX idx_pir_type ON post_implementation_reviews(review_type);

CREATE TRIGGER trg_pir_updated
    BEFORE UPDATE ON post_implementation_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- PIR templates for reusable review structures
CREATE TABLE pir_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    review_type TEXT NOT NULL DEFAULT 'project',
    sections    JSONB NOT NULL DEFAULT '[]',  -- [{key, label, description, required}]
    is_default  BOOLEAN DEFAULT false,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pir_templates_tenant ON pir_templates(tenant_id);
CREATE TRIGGER trg_pir_templates_updated
    BEFORE UPDATE ON pir_templates
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Seed a default PIR template
INSERT INTO pir_templates (id, tenant_id, name, description, review_type, sections, is_default, created_by) VALUES
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Standard Project PIR',
 'Default template for project post-implementation reviews', 'project',
 '[
   {"key": "objectives_met", "label": "Objectives Achievement", "description": "Were the stated project objectives fully achieved?", "required": true},
   {"key": "scope_adherence", "label": "Scope Management", "description": "Was project scope managed effectively? Any scope creep?", "required": true},
   {"key": "timeline_adherence", "label": "Timeline Performance", "description": "Was the project delivered on schedule?", "required": true},
   {"key": "budget_adherence", "label": "Budget Performance", "description": "Was the project delivered within budget?", "required": true},
   {"key": "quality_assessment", "label": "Quality Assessment", "description": "Assess the quality of deliverables against acceptance criteria.", "required": true},
   {"key": "stakeholder_satisfaction", "label": "Stakeholder Satisfaction", "description": "Summary of stakeholder feedback and satisfaction levels.", "required": false}
 ]'::jsonb,
 true, '00000000-0000-0000-0000-000000000099');

-- +goose Down
DROP TABLE IF EXISTS pir_templates;
DROP TABLE IF EXISTS post_implementation_reviews;
```

**Backend — PIR Service**:

Create `itd-opms-api/internal/modules/planning/pir_service.go`:

```go
type PIRService struct {
    pool     *pgxpool.Pool
    auditSvc *audit.AuditService
}

// Methods:
CreatePIR(ctx, tenantID, req CreatePIRRequest) (*PIR, error)
GetPIR(ctx, id uuid.UUID) (*PIR, error)
ListPIRs(ctx, tenantID, projectID *uuid.UUID, status string, page, limit int) ([]PIR, int64, error)
UpdatePIR(ctx, id uuid.UUID, req UpdatePIRRequest) (*PIR, error)
CompletePIR(ctx, id uuid.UUID) (*PIR, error)   // Sets status=completed, completed_date=NOW()
DeletePIR(ctx, id uuid.UUID) error

// Templates
ListPIRTemplates(ctx, tenantID, reviewType string) ([]PIRTemplate, error)
GetPIRTemplate(ctx, id uuid.UUID) (*PIRTemplate, error)
CreatePIRTemplate(ctx, tenantID, req) (*PIRTemplate, error)

// Analytics
GetPIRStats(ctx, tenantID) (*PIRStats, error)  // Total PIRs, avg score, common lessons
```

Types to add in `types.go`:
```go
type PIR struct {
    ID                      uuid.UUID
    TenantID                uuid.UUID
    ProjectID               uuid.UUID
    ProjectTitle            string    // Joined from projects table
    Title                   string
    Status                  string
    ReviewType              string
    SourceType              *string
    SourceID                *uuid.UUID
    ScheduledDate           *time.Time
    CompletedDate           *time.Time
    FacilitatorID           *uuid.UUID
    FacilitatorName         *string   // Joined
    ObjectivesMet           *string
    ScopeAdherence          *string
    TimelineAdherence       *string
    BudgetAdherence         *string
    QualityAssessment       *string
    StakeholderSatisfaction *string
    Successes               json.RawMessage
    Challenges              json.RawMessage
    LessonsLearned          json.RawMessage
    Recommendations         json.RawMessage
    OverallScore            *int
    Participants            []uuid.UUID
    EvidenceRefs            []uuid.UUID
    CreatedBy               uuid.UUID
    CreatedAt               time.Time
    UpdatedAt               time.Time
}

type PIRTemplate struct {
    ID          uuid.UUID
    TenantID    uuid.UUID
    Name        string
    Description *string
    ReviewType  string
    Sections    json.RawMessage
    IsDefault   bool
    CreatedBy   uuid.UUID
    CreatedAt   time.Time
}

type PIRStats struct {
    TotalPIRs       int     `json:"totalPirs"`
    CompletedPIRs   int     `json:"completedPirs"`
    AvgScore        float64 `json:"avgScore"`
    CommonLessons   []string `json:"commonLessons"`
    PendingPIRs     int     `json:"pendingPirs"`
}
```

**Backend — PIR Handler**:

Create `itd-opms-api/internal/modules/planning/pir_handler.go`:

Routes (mount under `/planning/pir`):
```
POST   /planning/pir                    → CreatePIR (planning.manage)
GET    /planning/pir                    → ListPIRs (planning.view) — filter by projectId, status
GET    /planning/pir/stats              → GetPIRStats (planning.view)
GET    /planning/pir/templates          → ListPIRTemplates (planning.view)
POST   /planning/pir/templates          → CreatePIRTemplate (planning.manage)
GET    /planning/pir/{id}               → GetPIR (planning.view)
PUT    /planning/pir/{id}               → UpdatePIR (planning.manage)
POST   /planning/pir/{id}/complete      → CompletePIR (planning.manage)
DELETE /planning/pir/{id}               → DeletePIR (planning.manage)
```

Wire the PIR handler in the planning module's `Routes()` method and register in `server.go`.

**SQL Queries** — Add to `queries/planning.sql`:
```sql
-- name: CreatePIR :one
-- name: GetPIRByID :one (JOIN projects for project_title, JOIN users for facilitator_name)
-- name: ListPIRsByTenant :many (with optional project_id and status filters)
-- name: UpdatePIR :one
-- name: CompletePIR :one
-- name: DeletePIR :exec
-- name: CountPIRsByTenant :one
-- name: ListPIRTemplates :many
-- name: GetPIRTemplateByID :one
-- name: CreatePIRTemplate :one
```

**Frontend — PIR Hooks**:

Add to `itd-opms-portal/hooks/use-planning.ts`:
```typescript
usePIRs(page, limit, projectId?, status?)
usePIR(id)
usePIRTemplates(reviewType?)
useCreatePIR()
useUpdatePIR(id)
useCompletePIR()
useDeletePIR()
usePIRStats()
```

**Frontend — PIR List Page**:

Create `itd-opms-portal/app/dashboard/planning/pir/page.tsx`:
- Page header with "Post-Implementation Reviews" title, description
- Filter bar: Project (dropdown), Status (draft/in_progress/completed), Review Type
- Data table: Title, Project, Review Type, Scheduled Date, Status, Overall Score (stars), Facilitator, Actions
- "New PIR" button → create dialog or `/planning/pir/new` page
- Status badges: draft (gray), in_progress (blue), completed (green), cancelled (red)
- Overall score displayed as filled stars (1-5)

**Frontend — PIR Detail/Edit Page**:

Create `itd-opms-portal/app/dashboard/planning/pir/[id]/page.tsx`:
- Header with title, project name, status badge, actions (Edit, Complete, Delete)
- **Structured Review Sections** (rendered from template or the 6 fixed sections):
  - Objectives Achievement (textarea)
  - Scope Management (textarea)
  - Timeline Performance (textarea)
  - Budget Performance (textarea)
  - Quality Assessment (textarea)
  - Stakeholder Satisfaction (textarea)
- **Dynamic Sections**:
  - Successes: List with add/remove, each item has description + category dropdown (planning, technical, communication, process)
  - Challenges: List with add/remove, each item has description + category + root cause
  - Lessons Learned: List with add/remove, each item has description + category + recommendation + applicability (this project only / all projects / specific domain)
  - Recommendations: List with add/remove, each item has description + owner (user search) + priority + due date + status (open/in_progress/completed)
- **Overall Score**: 1-5 star rating selector
- **Participants**: Multi-user selector (reuse UserSearchAutocomplete pattern from org-units page)
- **Evidence**: File references (UUID list)
- Save as Draft / Complete buttons

Add a sidebar navigation entry under Planning group: "PIR Reviews" with `ClipboardCheck` icon (Lucide), permission `planning.view`.

---

## Wiring & Integration Checklist

1. **server.go** — Register new routes:
   - PIR handler under `/api/v1/planning/pir`
   - Timeline handler routes under existing planning group
   - Action tracker stats routes under existing governance group
   - RACI coverage summary route under existing governance group

2. **main.go** — Wire new services:
   - `TimelineService` and `PIRService` in planning module
   - `ActionReminderService` goroutine with hourly ticker
   - Pass `nats.JetStreamContext` to `ActionReminderService`

3. **Notification orchestrator** — Add 3 new event configs:
   - `governance.action_due_soon`
   - `governance.action_overdue`
   - `governance.action_critical_overdue`

4. **Sidebar** — Add 2 new navigation entries:
   - "Action Tracker" under Governance (icon: `ListChecks`, permission: `governance.view`)
   - "PIR Reviews" under Planning (icon: `ClipboardCheck`, permission: `planning.view`)

5. **Project detail page** — Add "Timeline" tab/button linking to Gantt view

6. **Portfolio detail page** — Add "Timeline" tab/button linking to portfolio Gantt view

---

## Verification Plan

1. **Go build**: `cd itd-opms-api && go build ./... && go vet ./...` — zero errors
2. **Frontend build**: `cd itd-opms-portal && npx tsc --noEmit` — zero TypeScript errors
3. **Migration**: `migrations/019_action_reminders.sql` and `020_post_implementation_reviews.sql` apply cleanly
4. **RACI Coverage**: `GET /api/v1/governance/raci/{id}/coverage` returns full gap analysis with `missingRoles` per activity
5. **Action Tracker**: New page at `/dashboard/governance/actions` shows overdue stats + filterable table
6. **Gantt Chart**: `/dashboard/planning/projects/{id}/timeline` renders horizontal bar chart with work items, milestones, progress
7. **PIR**: Create PIR from project detail → fill structured sections → complete → appears in PIR list with score
8. **Notifications**: Action reminder goroutine publishes NATS events for overdue items → delivered to in-app/email
9. **All existing functionality unaffected** — no regressions to existing pages/endpoints

# Module Audit: Planning / PMO (95% Complete)

## Audit Metadata

| Field | Value |
|---|---|
| **Module** | Planning / Project Management Office (PMO) |
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Overall Completeness** | 95% |
| **Backend Completeness** | 95% |
| **Frontend Completeness** | 95% |
| **Data Completeness** | 95% |

---

## 1. Module Purpose

The Planning module is the most feature-rich module in ITD-OPMS. It provides portfolio management, project lifecycle management, work breakdown structure (WBS) hierarchy, milestone tracking, time entry logging, risk register, issue management, change request management, project dependencies, stakeholder mapping, Gantt timeline visualization, budget tracking (actual/committed/forecast), MinIO-based document storage, and post-implementation reviews (PIR). It serves as the central hub for all IT Division project and portfolio management activities.

---

## 2. Implemented Capabilities

### 2.1 Portfolio Management
- Full CRUD for portfolios with fiscal year and status
- Portfolio roadmap view showing all child projects
- Portfolio analytics summary endpoint
- Portfolio timeline for Gantt chart rendering

### 2.2 Project Management
- Full CRUD for projects with comprehensive metadata (charter, scope, business case, RAG status, priority)
- Project approval workflow
- Project dependencies with types (`finish_to_start`) and delay impact tracking
- Stakeholder management with add/remove operations
- Project timeline for Gantt chart rendering
- RAG status tracking (Red/Amber/Green)
- Completion percentage tracking
- Division assignment (via migration 022)

### 2.3 Work Breakdown Structure (WBS)
- Full CRUD for work items with parent-child hierarchy
- WBS tree retrieval per project
- Status transition endpoint for work item lifecycle
- Overdue work item detection
- Status count aggregation per project
- Time entry logging per work item
- Bulk update support for work items
- Filtering by project, status, assignee, priority, and type

### 2.4 Milestones
- Full CRUD for milestones linked to projects
- Milestone listing by project filter

### 2.5 Risk Register
- Full CRUD for risks with project, status, and category filtering
- Risk scoring (likelihood x impact) computed values
- Risk detail views

### 2.6 Issue Management
- Full CRUD for issues with project, status, and severity filtering
- Issue escalation endpoint with escalation target tracking
- Issue detail views

### 2.7 Change Request Management
- Full CRUD for change requests with project and status filtering
- Change request status transition endpoint
- Change calendar integration (migration 025)

### 2.8 Budget Tracking
- Budget handler, service, and types (dedicated files)
- Cost categories, project cost entries, budget snapshots (migration 026)
- Budget dashboard page with actual/committed/forecast tracking
- Per-project budget pages
- Dedicated `use-budget.ts` hooks file

### 2.9 Document Management (MinIO)
- Document upload via multipart form data
- Document listing with pagination, category, status, and search filtering
- Document category count aggregation
- Document metadata update
- Document deletion
- Presigned download URL generation
- Project document tables (migration 023)

### 2.10 Post-Implementation Reviews (PIR)
- Full CRUD for PIRs with project and status filtering
- PIR completion workflow endpoint
- PIR statistics aggregation
- PIR template management
- PIR tables (migration 020)
- Dedicated PIR detail page

### 2.11 Timeline / Gantt
- Project timeline endpoint returning structured data for Gantt rendering
- Portfolio timeline endpoint for cross-project Gantt views
- Dedicated timeline handler and service files
- Per-project and per-portfolio timeline pages

---

## 3. Capability Evidence Table

| Capability | Frontend Evidence | API Evidence | DB Evidence | Status | Gaps | Recommended Next Action |
|---|---|---|---|---|---|---|
| **Portfolio CRUD** | `portfolios/page.tsx`, `portfolios/new/page.tsx`, `portfolios/[id]/page.tsx` | `POST/GET/PUT/DELETE /planning/portfolios` | `portfolios` table (migration 008) | COMPLETE | None | -- |
| **Portfolio Roadmap** | Part of portfolio detail page | `GET /planning/portfolios/{id}/roadmap` | Computed from `projects` by `portfolio_id` | COMPLETE | None | -- |
| **Portfolio Analytics** | `usePortfolioAnalytics` hook | `GET /planning/portfolios/{id}/analytics` | Aggregated from projects | COMPLETE | None | -- |
| **Portfolio Timeline** | `portfolios/[id]/timeline/page.tsx` | `GET /planning/portfolios/{id}/timeline` | Computed from project dates | COMPLETE | None | -- |
| **Project CRUD** | `projects/page.tsx`, `projects/new/page.tsx`, `projects/[id]/page.tsx`, `projects/[id]/edit/page.tsx` | `POST/GET/PUT/DELETE /planning/projects` | `projects` table with 20+ columns | COMPLETE | None | -- |
| **Project Approval** | `useApproveProject` hook | `POST /planning/projects/{id}/approve` | Status transition in `projects.status` | COMPLETE | No rejection endpoint | Add reject transition |
| **Project Dependencies** | `useProjectDependencies`, `useAddProjectDependency`, `useRemoveProjectDependency` hooks | `POST/GET/DELETE /planning/projects/{id}/dependencies` | `project_dependencies` table | COMPLETE | No dependency impact analysis computation | Build cascading delay analysis |
| **Stakeholder Management** | `useProjectStakeholders`, `useAddProjectStakeholder`, `useRemoveProjectStakeholder` hooks | `POST/GET/DELETE /planning/projects/{id}/stakeholders` | `project_stakeholders` table | COMPLETE | None | -- |
| **Project Timeline** | `projects/[id]/timeline/page.tsx` | `GET /planning/projects/{id}/timeline` | Computed from work items and milestones | COMPLETE | None | -- |
| **RAG Status** | Visual RAG selectors in project edit form | Stored in `projects.rag_status` | `rag_status TEXT NOT NULL DEFAULT 'green'` | COMPLETE | None | -- |
| **Work Items CRUD** | `work-items/page.tsx`, `work-items/new/page.tsx`, `work-items/[id]/page.tsx` | `POST/GET/PUT/DELETE /planning/work-items` | `work_items` table | COMPLETE | None | -- |
| **WBS Hierarchy** | `useWBSTree` hook | `GET /planning/work-items/wbs?project_id=...` | `work_items.parent_id` self-reference | COMPLETE | None | -- |
| **Work Item Transitions** | `useTransitionWorkItem` hook | `PUT /planning/work-items/{id}/transition` | Status field update with validation | COMPLETE | None | -- |
| **Overdue Work Items** | `useOverdueWorkItems` hook | `GET /planning/work-items/overdue` | Computed from `due_date` | COMPLETE | None | -- |
| **Status Counts** | `useWorkItemStatusCounts` hook | `GET /planning/work-items/status-counts?project_id=...` | Aggregated from `work_items` | COMPLETE | None | -- |
| **Time Entries** | Part of work item detail | `POST/GET /planning/work-items/{id}/time-entries` | `time_entries` table | COMPLETE | None | -- |
| **Bulk Work Item Update** | `useBulkUpdateWorkItems` hook | `POST /planning/work-items/bulk/update` | Batch update in transaction | COMPLETE | None | -- |
| **Milestones CRUD** | `milestones/page.tsx` | `POST/GET/PUT/DELETE /planning/milestones` | `milestones` table | COMPLETE | None | -- |
| **Risks CRUD** | `risks/page.tsx`, `risks/new/page.tsx`, `risks/[id]/page.tsx` | `POST/GET/PUT/DELETE /planning/risks` | `risk_register` table | COMPLETE | None | -- |
| **Risk Scoring** | Visual scoring in risk forms | Computed in service layer | `likelihood`, `impact`, `risk_score` columns | COMPLETE | None | -- |
| **Issues CRUD** | `issues/page.tsx`, `issues/new/page.tsx`, `issues/[id]/page.tsx` | `POST/GET/PUT/DELETE /planning/issues` | `issues` table | COMPLETE | None | -- |
| **Issue Escalation** | `useEscalateIssue` hook | `PUT /planning/issues/{id}/escalate` | `escalated_to_id` column | COMPLETE | No notification on escalation | Wire NATS notification |
| **Change Requests CRUD** | `change-requests/page.tsx`, `change-requests/new/page.tsx`, `change-requests/[id]/page.tsx` | `POST/GET/PUT/DELETE /planning/change-requests` | `change_requests` table | COMPLETE | None | -- |
| **CR Status Transition** | `useUpdateChangeRequestStatus` hook | `PUT /planning/change-requests/{id}/status` | Status field update | COMPLETE | None | -- |
| **Budget Tracking** | `budget/page.tsx`, `projects/[id]/budget/page.tsx` | Budget handler endpoints | `cost_categories`, `project_cost_entries`, `budget_snapshots` tables (migration 026) | COMPLETE | None | -- |
| **Document Upload (MinIO)** | `useUploadProjectDocument` (multipart) | `POST /planning/projects/{id}/documents` | `project_documents` table (migration 023) | COMPLETE | None | -- |
| **Document Download** | `useDownloadProjectDocument` hook | `GET /planning/projects/{id}/documents/{docId}/download` | Presigned URL from MinIO | COMPLETE | None | -- |
| **Document Metadata** | `useUpdateProjectDocument` hook | `PUT /planning/projects/{id}/documents/{docId}` | `project_documents` table | COMPLETE | None | -- |
| **Document Categories** | `useProjectDocumentCategories` hook | `GET /planning/projects/{id}/documents/categories` | Aggregated counts | COMPLETE | None | -- |
| **PIR CRUD** | `pir/page.tsx`, `pir/[id]/page.tsx` | `POST/GET/PUT/DELETE /planning/pir` | `post_implementation_reviews` table (migration 020) | COMPLETE | None | -- |
| **PIR Completion** | `useCompletePIR` hook | `POST /planning/pir/{id}/complete` | Status transition | COMPLETE | None | -- |
| **PIR Statistics** | `usePIRStats` hook | `GET /planning/pir/stats` | Aggregated from PIR records | COMPLETE | None | -- |
| **PIR Templates** | `usePIRTemplates` hook | `GET /planning/pir/templates` | `pir_templates` table | COMPLETE | None | -- |
| **Calendar View** | `calendar/page.tsx` | Calendar handler + `use-calendar.ts` hook | Change calendar (migration 025) | COMPLETE | None | -- |
| **Resource Allocation Handler** | Not implemented | Not implemented | No dedicated table | MISSING | No resource allocation across projects | Build resource allocation service |
| **Dependency Impact Analysis** | Not implemented | Not implemented | Dependencies stored but not analyzed | MISSING | No cascading delay computation | Build impact analysis algorithm |

---

## 4. UI / API / DB Mapping

### 4.1 Frontend Pages (25+ pages)

| Page | Route | Purpose |
|---|---|---|
| Planning Hub | `/dashboard/planning/page.tsx` | Module landing with portfolio/project summary |
| Portfolios List | `/dashboard/planning/portfolios/page.tsx` | Portfolio list with status filters |
| New Portfolio | `/dashboard/planning/portfolios/new/page.tsx` | Portfolio creation form |
| Portfolio Detail | `/dashboard/planning/portfolios/[id]/page.tsx` | Portfolio with project roster and analytics |
| Portfolio Timeline | `/dashboard/planning/portfolios/[id]/timeline/page.tsx` | Gantt chart for portfolio projects |
| Projects List | `/dashboard/planning/projects/page.tsx` | Project list with multi-filter |
| New Project | `/dashboard/planning/projects/new/page.tsx` | Project creation form |
| Project Detail | `/dashboard/planning/projects/[id]/page.tsx` | Project overview with all sub-entities |
| Project Edit | `/dashboard/planning/projects/[id]/edit/page.tsx` | Enhanced edit form with visual selectors |
| Project Timeline | `/dashboard/planning/projects/[id]/timeline/page.tsx` | Gantt chart for project work items |
| Project Budget | `/dashboard/planning/projects/[id]/budget/page.tsx` | Budget tracking dashboard |
| Work Items List | `/dashboard/planning/work-items/page.tsx` | Work items with advanced filtering |
| New Work Item | `/dashboard/planning/work-items/new/page.tsx` | Work item creation form |
| Work Item Detail | `/dashboard/planning/work-items/[id]/page.tsx` | Work item with time entries |
| Milestones | `/dashboard/planning/milestones/page.tsx` | Milestone list and management |
| Risks List | `/dashboard/planning/risks/page.tsx` | Risk register with scoring |
| New Risk | `/dashboard/planning/risks/new/page.tsx` | Risk creation form |
| Risk Detail | `/dashboard/planning/risks/[id]/page.tsx` | Risk detail and mitigation |
| Issues List | `/dashboard/planning/issues/page.tsx` | Issue tracker with severity filters |
| New Issue | `/dashboard/planning/issues/new/page.tsx` | Issue creation form |
| Issue Detail | `/dashboard/planning/issues/[id]/page.tsx` | Issue detail with escalation |
| Change Requests List | `/dashboard/planning/change-requests/page.tsx` | CR list with status filters |
| New CR | `/dashboard/planning/change-requests/new/page.tsx` | CR creation form |
| CR Detail | `/dashboard/planning/change-requests/[id]/page.tsx` | CR detail with approval status |
| Budget Dashboard | `/dashboard/planning/budget/page.tsx` | Cross-project budget overview |
| Calendar | `/dashboard/planning/calendar/page.tsx` | Change/release calendar view |
| PIR List | `/dashboard/planning/pir/page.tsx` | Post-implementation review list |
| PIR Detail | `/dashboard/planning/pir/[id]/page.tsx` | PIR detail and completion |

### 4.2 Backend Files (29 files)

| File | Purpose |
|---|---|
| `handler.go` | Route registration for all planning endpoints |
| `types.go` | Shared types and request/response structs |
| `types_test.go` | Type validation tests |
| `portfolio_handler.go` | Portfolio CRUD, roadmap, analytics, timeline handlers |
| `portfolio_handler_test.go` | Portfolio handler tests |
| `portfolio_service.go` | Portfolio business logic |
| `workitem_handler.go` | Work item CRUD, WBS, transitions, time entries, bulk ops |
| `workitem_handler_test.go` | Work item handler tests |
| `workitem_service.go` | Work item business logic |
| `workitem_service_test.go` | Work item service unit tests |
| `risk_handler.go` | Risk CRUD handlers |
| `risk_handler_test.go` | Risk handler tests |
| `risk_service.go` | Risk business logic with scoring |
| `risk_service_test.go` | Risk service unit tests |
| `timeline_handler.go` | Project and portfolio timeline data handlers |
| `timeline_handler_test.go` | Timeline handler tests |
| `timeline_service.go` | Timeline computation logic |
| `budget_handler.go` | Budget tracking handlers |
| `budget_handler_test.go` | Budget handler tests |
| `budget_service.go` | Budget business logic |
| `budget_types.go` | Budget-specific type definitions |
| `budget_types_test.go` | Budget type validation tests |
| `pir_handler.go` | PIR CRUD, completion, stats, templates handlers |
| `pir_handler_test.go` | PIR handler tests |
| `pir_service.go` | PIR business logic |
| `document_handler.go` | Document upload, download, update, delete handlers (MinIO) |
| `document_handler_test.go` | Document handler tests |
| `document_service.go` | Document business logic with MinIO integration |
| `document_service_test.go` | Document service unit tests |

### 4.3 Database Tables (15+ tables)

| Table | Migration | Key Columns |
|---|---|---|
| `portfolios` | 008 | id, tenant_id, name, description, owner_id, fiscal_year, status |
| `projects` | 008 | id, tenant_id, portfolio_id, title, code, charter, scope, business_case, sponsor_id, project_manager_id, status, rag_status, priority, planned/actual dates, budget_approved/spent, completion_pct, metadata |
| `project_dependencies` | 008 | id, project_id, depends_on_project_id, dependency_type, impact_if_delayed |
| `project_stakeholders` | 008 | id, project_id, user_id, role, interest_level |
| `work_items` | 008 | id, tenant_id, project_id, parent_id, title, type, status, priority, assignee_id, due_date, estimated_hours, actual_hours, wbs_code |
| `milestones` | 008 | id, tenant_id, project_id, name, description, due_date, status |
| `time_entries` | 008 | id, work_item_id, user_id, hours, description, logged_date |
| `risk_register` | 008 | id, tenant_id, project_id, title, description, category, likelihood, impact, risk_score, status, owner_id, mitigation, contingency |
| `issues` | 008 | id, tenant_id, project_id, title, description, severity, status, assigned_to, escalated_to_id |
| `change_requests` | 008 | id, tenant_id, project_id, title, description, type, status, impact, priority, requested_by |
| `project_documents` | 023 | id, project_id, tenant_id, title, category, file_name, file_size, mime_type, storage_path, status, uploaded_by |
| `cost_categories` | 026 | id, tenant_id, name, description |
| `project_cost_entries` | 026 | id, project_id, cost_category_id, description, amount, type (actual/committed/forecast), entry_date |
| `budget_snapshots` | 026 | id, project_id, snapshot_date, total_approved, total_actual, total_committed, total_forecast |
| `post_implementation_reviews` | 020 | id, tenant_id, project_id, title, status, review_type, findings, lessons_learned, recommendations |
| `pir_templates` | 020 | id, tenant_id, name, review_type, sections_json |

### 4.4 React Query Hooks (60+ hooks across use-planning.ts and use-budget.ts)

**Portfolio hooks:** `usePortfolios`, `usePortfolio`, `usePortfolioRoadmap`, `usePortfolioAnalytics`, `usePortfolioTimeline`, `useCreatePortfolio`, `useUpdatePortfolio`, `useDeletePortfolio`

**Project hooks:** `useProjects`, `useProject`, `useProjectDependencies`, `useProjectStakeholders`, `useProjectTimeline`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`, `useApproveProject`, `useAddProjectDependency`, `useRemoveProjectDependency`, `useAddProjectStakeholder`, `useRemoveProjectStakeholder`

**Work item hooks:** `useWorkItems`, `useWorkItem`, `useWBSTree`, `useOverdueWorkItems`, `useWorkItemStatusCounts`, `useTimeEntries`, `useCreateWorkItem`, `useUpdateWorkItem`, `useTransitionWorkItem`, `useDeleteWorkItem`, `useLogTimeEntry`, `useBulkUpdateWorkItems`

**Risk/Issue/CR hooks:** `useRisks`, `useRisk`, `useCreateRisk`, `useUpdateRisk`, `useDeleteRisk`, `useIssues`, `useIssue`, `useCreateIssue`, `useUpdateIssue`, `useDeleteIssue`, `useEscalateIssue`, `useChangeRequests`, `useChangeRequest`, `useCreateChangeRequest`, `useUpdateChangeRequest`, `useUpdateChangeRequestStatus`, `useDeleteChangeRequest`

**Milestone hooks:** `useMilestones`, `useCreateMilestone`, `useUpdateMilestone`, `useDeleteMilestone`

**PIR hooks:** `usePIRs`, `usePIR`, `usePIRStats`, `usePIRTemplates`, `useCreatePIR`, `useUpdatePIR`, `useCompletePIR`, `useDeletePIR`

**Document hooks:** `useProjectDocuments`, `useProjectDocumentCategories`, `useUploadProjectDocument`, `useUpdateProjectDocument`, `useDeleteProjectDocument`, `useDownloadProjectDocument`

---

## 5. Workflow / State Machine Coverage

### 5.1 Project Status Workflow

```
proposed --> approved --> active --> on_hold --> completed --> closed
                                             --> cancelled
```

### 5.2 Work Item Status Workflow

```
backlog --> todo --> in_progress --> in_review --> done
                                                --> blocked
```

Transitions enforced via `PUT /planning/work-items/{id}/transition` with server-side validation.

### 5.3 Risk Status Workflow

```
identified --> assessed --> mitigated --> closed
                                     --> accepted
```

### 5.4 Change Request Status Workflow

```
submitted --> under_review --> approved --> implemented --> closed
                           --> rejected
                           --> deferred
```

### 5.5 PIR Status Workflow

```
draft --> in_progress --> completed
```

---

## 6. Security & Tenancy Review

| Check | Status | Notes |
|---|---|---|
| Tenant ID filtering in queries | PRESENT | All queries include `tenant_id` from JWT context |
| Row-Level Security (RLS) | MISSING | No PostgreSQL RLS policies on planning tables |
| Authorization checks | PARTIAL | Handlers extract tenant but limited role enforcement |
| Project-level access control | NOT ENFORCED | No check that user is a PM/stakeholder of the project |
| Document access control | PARTIAL | Documents scoped to project; project access not verified |
| Budget write access | NOT ENFORCED | No role check for budget modifications |
| MinIO bucket isolation | PRESENT | Files stored in tenant-scoped paths |
| Unique project codes | PRESENT | `UNIQUE(tenant_id, code)` constraint prevents duplicates |
| Input validation | PRESENT | Handler-level validation on required fields |

---

## 7. Data Model Coverage

### 7.1 Seed Data Assessment

| Data Type | Seeded | Count | Quality |
|---|---|---|---|
| Portfolios | YES | AMD division portfolio | Realistic fiscal year assignment |
| Projects | YES | Multiple projects | With codes, managers, RAG status |
| Work Items | Partial | Some seeded | WBS hierarchy present |
| Risks | NO | 0 | No seed risks |
| Milestones | NO | 0 | No seed milestones |
| Budget entries | NO | 0 | No seed cost data |
| Documents | NO | 0 | No seed documents |
| PIRs | NO | 0 | No seed PIRs |

### 7.2 Data Integrity

| Check | Status |
|---|---|
| Foreign key constraints | PRESENT on all reference columns |
| Unique constraints | `UNIQUE(tenant_id, code)` on projects |
| CASCADE deletes | `ON DELETE CASCADE` on project_dependencies |
| NOT NULL enforcement | Applied on all required fields |
| JSONB validation | `metadata JSONB DEFAULT '{}'` with default |
| Decimal precision | `DECIMAL(15,2)` for budget, `DECIMAL(5,2)` for completion percentage |
| Updated_at triggers | Present on projects, portfolios |

---

## 8. Notification / Reporting / Search Integration

| Integration | Status | Details |
|---|---|---|
| **Notifications** | NOT INTEGRATED | No NATS events for project status changes, risk escalation, or overdue work items |
| **Reporting** | PARTIAL | Planning hub has analytics dashboard; no exportable reports |
| **Search** | NOT INTEGRATED | No full-text search on projects, work items, or risks |
| **Calendar** | INTEGRATED | Dedicated calendar page with change/release schedule |
| **Budget** | INTEGRATED | Dedicated budget hooks and dashboard pages |
| **MinIO Documents** | FULLY INTEGRATED | Upload, download, metadata update, deletion all working |

---

## 9. Known Defects & Risks

| # | Severity | Description | Impact | File/Location |
|---|---|---|---|---|
| 1 | **HIGH** | No project-level access control | Any tenant user can modify any project | All project handlers |
| 2 | **MEDIUM** | Resource allocation handler missing | Cannot assign/track staff across projects | Module-wide gap |
| 3 | **MEDIUM** | Dependency impact analysis not implemented | Cannot compute cascading delays | `portfolio_service.go` |
| 4 | **MEDIUM** | No rejection workflow for project approval | Projects can only move forward | `portfolio_handler.go` |
| 5 | **LOW** | No seed data for risks, milestones, budget, PIRs | Demo scenarios incomplete for these features | Seed migrations |
| 6 | **LOW** | No escalation notification for issues | Issue escalation happens silently | `risk_handler.go` |

---

## 10. What Must Be Built Next (Priority Order)

| Priority | Item | Effort | Rationale |
|---|---|---|---|
| **P0** | Add project-level access control (PM/stakeholder verification) | 2 days | Security: prevent unauthorized project modifications |
| **P1** | Build resource allocation handler and service | 3 days | Core PMO feature for staff planning across projects |
| **P1** | Implement dependency impact analysis algorithm | 2 days | Critical for project managers to assess cascading delays |
| **P1** | Add project rejection/revert workflow | 1 day | Complete the approval lifecycle |
| **P2** | Wire NATS notifications for project status changes | 1 day | Stakeholders need to know when status changes |
| **P2** | Seed risks, milestones, budget entries, and PIRs | 1 day | Complete demo data story |
| **P2** | Add exportable reports (PDF/CSV) for project status | 2 days | Management reporting requirement |
| **P3** | Add full-text search across projects and work items | 1 day | Improve discoverability |
| **P3** | Add issue escalation notifications via NATS | 0.5 day | Escalated issues should alert the target |

---

*This audit was conducted against the `dev` branch. All findings reflect the codebase state at the time of analysis and should be re-validated after remediation.*

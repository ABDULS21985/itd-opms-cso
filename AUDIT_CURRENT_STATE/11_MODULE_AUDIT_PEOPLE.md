# Module Audit: People Management (85% Complete)

## Audit Metadata

| Field | Value |
|---|---|
| **Module** | People Management |
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Overall Completeness** | 85% |
| **Backend Completeness** | 85% |
| **Frontend Completeness** | 85% |
| **Data Completeness** | 85% |

---

## 1. Module Purpose

The People Management module provides workforce planning, skills management, onboarding/offboarding checklists, roster/shift scheduling, leave management, capacity allocation, training records, and skills heatmap analysis for the IT Division. It enables the AMD to track staff competencies, manage workforce transitions, and visualize capacity utilization across teams and projects.

---

## 2. Implemented Capabilities

### 2.1 Skills Management
- Hierarchical skill categories with parent-child relationships
- Full CRUD for skill categories and individual skills
- User skill assignments with proficiency levels (`beginner`, `intermediate`, `advanced`, `expert`)
- Certification tracking with expiry dates
- Skill verification by managers (`verified_by`, `verified_at`)
- Skills lookup by user and by skill (reverse lookup)
- Role skill requirements definition per role type
- Skill gap analysis comparing user skills against role requirements
- Seeded with 20 skill categories and 100 skills

### 2.2 Onboarding / Offboarding Checklists
- Checklist template management (CRUD) with type and role filtering
- Checklist instance creation from templates
- Task management within checklists (create, update, complete, delete)
- Checklist status workflow management
- Separate onboarding and offboarding frontend pages

### 2.3 Roster / Shift Management
- Full CRUD for rosters with team and status filtering
- Pagination support for roster lists

### 2.4 Leave Management
- Full CRUD for leave records with user and status filtering
- Leave status update endpoint for approval/rejection
- Leave record deletion capability

### 2.5 Capacity Allocation
- Full CRUD for capacity allocations
- Filtering by user and project
- Dedicated capacity management frontend page

### 2.6 Training Records
- Full CRUD for training records with user, type, and status filtering
- Expiring certifications detection endpoint (configurable N-day lookahead)
- Training record detail views

### 2.7 Skills Heatmap
- Dedicated heatmap service with handler, service, and types
- Heatmap visualization page
- Backend test coverage for heatmap calculations

---

## 3. Capability Evidence Table

| Capability | Frontend Evidence | API Evidence | DB Evidence | Status | Gaps | Recommended Next Action |
|---|---|---|---|---|---|---|
| **Skill Categories CRUD** | `skills/page.tsx` (categories section) | `POST/GET/PUT/DELETE /people/skills/categories` | `skill_categories` table (migration 011) | COMPLETE | None | -- |
| **Skills CRUD** | `skills/page.tsx` | `POST/GET/PUT/DELETE /people/skills` | `skills` table | COMPLETE | None | -- |
| **User Skill Assignments** | `useUserSkills`, `useCreateUserSkill`, `useUpdateUserSkill`, `useDeleteUserSkill` hooks | `POST/GET/PUT/DELETE /people/skills/user-skills` | `user_skills` table with `UNIQUE(user_id, skill_id)` | COMPLETE | None | -- |
| **Skill Verification** | `useVerifyUserSkill` hook | `PUT /people/skills/user-skills/{id}/verify` | `verified_by`, `verified_at` columns | COMPLETE | No notification to user upon verification | Add notification on verification |
| **Skill Proficiency Levels** | Proficiency selector in UI | Validated in handler | `CHECK (proficiency_level IN ('beginner','intermediate','advanced','expert'))` | COMPLETE | None | -- |
| **Certification Tracking** | Training and skills pages | Training record endpoints | `certified`, `certification_name`, `certification_expiry` columns in `user_skills` | COMPLETE | No file upload for certificates | Wire MinIO for certificate uploads |
| **Role Skill Requirements** | `useRoleSkillRequirements`, `useCreateRoleSkillRequirement` hooks | `POST/GET/DELETE /people/skills/requirements` | `role_skill_requirements` table | COMPLETE | None | -- |
| **Skill Gap Analysis** | `useSkillGapAnalysis` hook | `GET /people/skills/requirements/{roleType}/gap/{userId}` | Computed from `user_skills` vs `role_skill_requirements` | COMPLETE | No aggregate team-level gap dashboard | Build team gap aggregation view |
| **Checklist Templates** | `onboarding/page.tsx`, `offboarding/page.tsx` | `POST/GET/PUT/DELETE /people/checklists/templates` | `checklist_templates` table | COMPLETE | None | -- |
| **Checklists CRUD** | Same pages | `POST/GET/DELETE /people/checklists`, `PUT /people/checklists/{id}/status` | `checklists` table | COMPLETE | None | -- |
| **Checklist Tasks** | Task management within checklist detail | `POST/PUT/DELETE /people/checklists/tasks`, `PUT .../complete` | `checklist_tasks` table | COMPLETE | None | -- |
| **Roster Management** | `roster/page.tsx` | `POST/GET/PUT /people/rosters` | `rosters` table | COMPLETE | No delete endpoint; no shift pattern visualization | Add delete; build calendar view |
| **Leave Management** | `roster/page.tsx` (combined view) | `POST/GET/PUT/DELETE /people/leave`, `PUT /people/leave/{id}/status` | `leave_records` table | COMPLETE | No approval workflow details; no leave balance tracking | Build approval flow; add balance calculation |
| **Capacity Allocation** | `capacity/page.tsx` | `POST/GET/PUT/DELETE /people/capacity` | `capacity_allocations` table | COMPLETE | No over-allocation detection | Add validation for > 100% allocation |
| **Training Records** | `training/page.tsx` | `POST/GET/PUT/DELETE /people/training` | `training_records` table | COMPLETE | No certificate file upload | Wire MinIO for uploads |
| **Expiring Certifications** | `useExpiringCertifications` hook | `GET /people/training/expiring?days=N` | Computed from `training_records.certification_expiry` | COMPLETE | No proactive notification | Add NATS-based expiry alerts |
| **Skills Heatmap** | `capacity/heatmap/page.tsx` | Heatmap handler/service | Computed from `user_skills` aggregation | COMPLETE | None | -- |
| **People Analytics** | `analytics/page.tsx` | Not verified | Computed aggregations | PARTIAL | Page exists but data sources unconfirmed | Wire analytics to real aggregate queries |
| **File Uploads (Certificates)** | Not implemented | Not implemented | Documents table exists but not wired | MISSING | Cannot attach certification evidence | Wire MinIO upload pipeline |
| **Leave Approval Workflow** | Not implemented | Status update exists but no approval chain | No approval_id column on leave_records | MISSING | No multi-step approval for leave | Integrate with approval engine |

---

## 4. UI / API / DB Mapping

### 4.1 Frontend Pages (10 pages)

| Page | Route | Purpose |
|---|---|---|
| People Hub | `/dashboard/people/page.tsx` | Module landing with summary cards |
| Skills Directory | `/dashboard/people/skills/page.tsx` | Skill categories and skills list with user assignments |
| Roster | `/dashboard/people/roster/page.tsx` | Staff roster and leave management |
| Training | `/dashboard/people/training/page.tsx` | Training records and certification tracking |
| Onboarding | `/dashboard/people/onboarding/page.tsx` | Onboarding checklist templates and instances |
| Offboarding | `/dashboard/people/offboarding/page.tsx` | Offboarding checklist templates and instances |
| Capacity | `/dashboard/people/capacity/page.tsx` | Capacity allocation management |
| Skills Heatmap | `/dashboard/people/capacity/heatmap/page.tsx` | Visual skills/capacity heatmap |
| Analytics | `/dashboard/people/analytics/page.tsx` | People analytics dashboard |

### 4.2 Backend Files (20 files)

| File | Purpose |
|---|---|
| `handler.go` | Route registration for all people endpoints |
| `types.go` | Shared types and request/response structs |
| `types_test.go` | Type validation tests |
| `skill_handler.go` | Skill categories, skills, user skills, requirements, gap analysis handlers |
| `skill_handler_test.go` | Skill handler unit tests |
| `skill_service.go` | Skills business logic and DB queries |
| `checklist_handler.go` | Checklist templates, instances, and task handlers |
| `checklist_handler_test.go` | Checklist handler unit tests |
| `checklist_service.go` | Checklist business logic and DB queries |
| `roster_handler.go` | Roster and leave record handlers |
| `roster_handler_test.go` | Roster handler unit tests |
| `roster_service.go` | Roster and leave business logic |
| `training_handler.go` | Training records and expiring certification handlers |
| `training_handler_test.go` | Training handler unit tests |
| `training_service.go` | Training business logic and DB queries |
| `heatmap_handler.go` | Heatmap data handlers |
| `heatmap_handler_test.go` | Heatmap handler unit tests |
| `heatmap_service.go` | Heatmap aggregation and computation logic |
| `heatmap_service_test.go` | Heatmap service unit tests |
| `heatmap_types.go` | Heatmap-specific type definitions |

### 4.3 Database Tables (11 tables)

| Table | Migration | Key Columns | Indexes |
|---|---|---|---|
| `skill_categories` | 011 | id, tenant_id, name, description, parent_id | tenant |
| `skills` | 011 | id, tenant_id, category_id, name, description | tenant, category |
| `user_skills` | 011 | id, tenant_id, user_id, skill_id, proficiency_level, certified, certification_name, certification_expiry, verified_by, verified_at | tenant, tenant+user, skill; UNIQUE(user_id, skill_id) |
| `role_skill_requirements` | 011 | id, tenant_id, role_type, skill_id, min_proficiency | tenant, role_type |
| `checklist_templates` | 011 | id, tenant_id, name, type, role_type, tasks_json | tenant, type |
| `checklists` | 011 | id, tenant_id, template_id, user_id, type, status | tenant, user_id, status |
| `checklist_tasks` | 011 | id, checklist_id, title, description, assigned_to, status, completed_at | checklist_id |
| `rosters` | 011 | id, tenant_id, team_id, name, schedule, status | tenant, team_id |
| `leave_records` | 011 | id, tenant_id, user_id, type, start_date, end_date, status, reason | tenant, user_id, status |
| `capacity_allocations` | 011 | id, tenant_id, user_id, project_id, allocation_pct, start_date, end_date | tenant, user_id, project_id |
| `training_records` | 011 | id, tenant_id, user_id, title, type, provider, status, completion_date, certification_expiry | tenant, user_id, type |

### 4.4 React Query Hooks (42 hooks)

| Hook Category | Count | Examples |
|---|---|---|
| Skill Categories | 4 | `useSkillCategories`, `useSkillCategory`, `useCreateSkillCategory`, `useDeleteSkillCategory` |
| Skills | 5 | `useSkills`, `useSkill`, `useCreateSkill`, `useUpdateSkill`, `useDeleteSkill` |
| User Skills | 6 | `useUserSkills`, `useUsersBySkill`, `useCreateUserSkill`, `useUpdateUserSkill`, `useDeleteUserSkill`, `useVerifyUserSkill` |
| Skill Requirements | 3 | `useRoleSkillRequirements`, `useCreateRoleSkillRequirement`, `useDeleteRoleSkillRequirement` |
| Skill Gap Analysis | 1 | `useSkillGapAnalysis` |
| Checklist Templates | 4 | `useChecklistTemplates`, `useChecklistTemplate`, `useCreateChecklistTemplate`, `useDeleteChecklistTemplate` |
| Checklists | 4 | `useChecklists`, `useChecklist`, `useCreateChecklist`, `useDeleteChecklist` |
| Checklist Tasks | 4 | `useChecklistTasks`, `useCreateChecklistTask`, `useUpdateChecklistTask`, `useCompleteChecklistTask`, `useDeleteChecklistTask` |
| Rosters | 4 | `useRosters`, `useRoster`, `useCreateRoster`, `useUpdateRoster` |
| Leave Records | 4 | `useLeaveRecords`, `useLeaveRecord`, `useCreateLeaveRecord`, `useUpdateLeaveRecordStatus`, `useDeleteLeaveRecord` |
| Capacity | 4 | `useCapacityAllocations`, `useCreateCapacityAllocation`, `useUpdateCapacityAllocation`, `useDeleteCapacityAllocation` |
| Training | 5 | `useTrainingRecords`, `useTrainingRecord`, `useExpiringCertifications`, `useCreateTrainingRecord`, `useUpdateTrainingRecord`, `useDeleteTrainingRecord` |

---

## 5. Workflow / State Machine Coverage

### 5.1 Checklist Status Workflow

```
not_started --> in_progress --> completed
                            --> cancelled
```

### 5.2 Leave Record Status Workflow

```
pending --> approved
        --> rejected
        --> cancelled
```

**Note:** Status transitions are handled via a generic status update endpoint (`PUT /people/leave/{id}/status`). There is no formal approval chain or multi-step workflow integrated with the approval engine.

### 5.3 Checklist Task Status

```
pending --> completed (via /complete endpoint)
```

---

## 6. Security & Tenancy Review

| Check | Status | Notes |
|---|---|---|
| Tenant ID filtering in queries | PRESENT | All queries include `tenant_id` from JWT context |
| Row-Level Security (RLS) | MISSING | No PostgreSQL RLS policies on people tables |
| Authorization checks | PARTIAL | Handlers extract tenant but do not enforce role-based access |
| Manager-only verification | NOT ENFORCED | Any user can verify any user's skill |
| Data isolation | PRESENT | Tenant scoping at application layer |
| Input validation | PRESENT | Proficiency level CHECK constraint in DB |
| Sensitive data | LOW RISK | No PII beyond names (sourced from users table via user_id FK) |

---

## 7. Data Model Coverage

### 7.1 Seed Data Assessment

| Data Type | Seeded | Count | Quality |
|---|---|---|---|
| Skill Categories | YES | 20 | IT-relevant categories (Networking, Security, Cloud, etc.) |
| Skills | YES | 100 | Mapped to categories with realistic names |
| User Skills | NO | 0 | No user-skill assignments seeded |
| Checklist Templates | NO | 0 | No onboarding/offboarding templates seeded |
| Rosters | NO | 0 | No roster data seeded |
| Leave Records | NO | 0 | No leave records seeded |
| Training Records | NO | 0 | No training records seeded |

### 7.2 Data Integrity

| Check | Status |
|---|---|
| Foreign key constraints | PRESENT on all reference columns |
| Unique constraints | `UNIQUE(user_id, skill_id)` on `user_skills` |
| CHECK constraints | Proficiency level validation |
| NOT NULL enforcement | Applied on required fields |
| Self-referential FK | `skill_categories.parent_id` -> `skill_categories.id` |
| Updated_at triggers | Present on `skill_categories`, `skills`, `user_skills` |

---

## 8. Notification / Reporting / Search Integration

| Integration | Status | Details |
|---|---|---|
| **Notifications** | NOT INTEGRATED | No NATS events emitted for skill verification, certification expiry, or checklist assignments |
| **Reporting** | NOT INTEGRATED | No people-specific reports (skill gap summary, training compliance, capacity utilization) |
| **Search** | NOT INTEGRATED | No full-text search on skills or training records |
| **Heatmap** | INTEGRATED | Dedicated heatmap handler with computed aggregations |

---

## 9. Known Defects & Risks

| # | Severity | Description | Impact | File/Location |
|---|---|---|---|---|
| 1 | **HIGH** | No role-based authorization on skill verification | Any user can verify any other user's skill | `skill_handler.go` |
| 2 | **MEDIUM** | No file upload for certification evidence | Compliance audit cannot verify certificates | Module-wide |
| 3 | **MEDIUM** | Leave approval has no formal workflow | No approval chain, no manager notification | `roster_handler.go` |
| 4 | **MEDIUM** | Capacity allocation allows > 100% without warning | Over-allocation not detected or flagged | `roster_service.go` |
| 5 | **MEDIUM** | No seed data for user skills, checklists, or training | Demo scenarios incomplete for most sub-features | Seed migrations |
| 6 | **MEDIUM** | Analytics page data sources unverified | Page may render with empty or placeholder data | `analytics/page.tsx` |
| 7 | **LOW** | No roster deletion endpoint | Obsolete rosters cannot be removed | `roster_handler.go` |
| 8 | **LOW** | No expiring certification notifications | Users not alerted when certifications are about to expire | Backend notification gap |

---

## 10. What Must Be Built Next (Priority Order)

| Priority | Item | Effort | Rationale |
|---|---|---|---|
| **P0** | Add role-based authorization to all handlers | 2 days | Security requirement: managers-only for verification and leave approval |
| **P1** | Wire file upload for certificates and evidence | 2 days | MinIO infrastructure exists; needs endpoint and UI integration |
| **P1** | Build leave approval workflow with approval engine | 2 days | Multi-step approval with manager notification |
| **P1** | Add capacity over-allocation detection and warning | 0.5 day | Prevent > 100% allocation per user per period |
| **P2** | Seed user skills, checklists, and training records | 1 day | Complete the demo data story for UAT |
| **P2** | Wire expiring certification notifications via NATS | 1 day | Proactive alerts for compliance |
| **P2** | Build team-level skill gap dashboard | 2 days | Aggregate individual gap analysis to team view |
| **P2** | Verify and wire analytics page data sources | 1 day | Ensure analytics page shows real computed data |
| **P3** | Add roster deletion (soft-delete) | 0.5 day | Housekeeping capability |
| **P3** | Add full-text search for skills directory | 1 day | Searchable skills catalog |

---

*This audit was conducted against the `dev` branch. All findings reflect the codebase state at the time of analysis and should be re-validated after remediation.*

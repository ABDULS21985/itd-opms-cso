# Module Audit: Governance (90% Complete)

## Audit Metadata

| Field | Value |
|---|---|
| **Module** | Governance |
| **Audit Date** | 2026-03-02 |
| **Branch** | `dev` |
| **Overall Completeness** | 90% |
| **Backend Completeness** | 95% |
| **Frontend Completeness** | 85% |
| **Data Completeness** | 90% |

---

## 1. Module Purpose

The Governance module provides policy lifecycle management, accountability matrices (RACI), committee/meeting governance, OKR/KPI tracking, and action item management for the IT Division. It is the organizational backbone ensuring that decisions are documented, policies are attested, responsibilities are assigned, and strategic objectives are measured.

---

## 2. Implemented Capabilities

### 2.1 Policy Lifecycle Management
- Full CRUD for policies with rich metadata (category, tags, scope, dates, owner)
- Status workflow state machine: `draft` -> `in_review` -> `approved` -> `published` -> `retired`
- Policy versioning with immutable version history (`policy_versions` table)
- Version diff comparison (v1 vs v2) via dedicated API endpoint and UI page
- Attestation campaigns with target scope, user lists, due dates, and completion rate tracking
- Individual attestation recording per user per campaign
- Policy submission, approval, publishing, and retirement via dedicated action endpoints

### 2.2 RACI Matrix Management
- Full CRUD for RACI matrices and individual entries
- Role assignments: Responsible, Accountable, Consulted, Informed
- Coverage gap analysis reports per matrix (`/governance/raci/{id}/coverage`)
- Tenant-wide coverage summary statistics (`/governance/raci/coverage-summary`)
- Seeded with 10 RACI matrices containing 56 entries with real staff IDs

### 2.3 Meeting Governance
- Full CRUD for meetings with status filtering and pagination
- Meeting decision recording and retrieval per meeting
- Action item creation, update, and completion tracking
- Overdue action items detection and retrieval
- Overdue action statistics endpoint (`/governance/meetings/actions/overdue/stats`)
- Personal overdue actions endpoint (`/governance/meetings/actions/overdue/mine`)

### 2.4 OKR & KPI Tracking
- Full CRUD for Objectives and Key Results
- Hierarchical OKR trees with parent-child relationships
- Key result CRUD (create, update, delete) linked to OKRs
- OKR filtering by level, period, and status
- Full CRUD for KPIs with pagination

### 2.5 Seed Data
- 20 policies seeded across multiple categories with real content
- 10 RACI matrices with 56 entries mapped to actual AMD staff user IDs

---

## 3. Capability Evidence Table

| Capability | Frontend Evidence | API Evidence | DB Evidence | Status | Gaps | Recommended Next Action |
|---|---|---|---|---|---|---|
| **Policy CRUD** | `policies/page.tsx`, `policies/new/page.tsx`, `policies/[id]/page.tsx`, `policies/[id]/edit/page.tsx` | `POST/GET/PUT /governance/policies` | `policies` table (migration 007) | COMPLETE | None | -- |
| **Policy Status Workflow** | `useSubmitPolicy`, `useApprovePolicy`, `usePublishPolicy`, `useRetirePolicy` hooks | `POST /governance/policies/{id}/submit\|approve\|publish\|retire` | `status TEXT NOT NULL DEFAULT 'draft'` with CHECK constraint implied | COMPLETE | No rejection/revert endpoint | Add reject/revert transitions |
| **Policy Versioning** | `policies/[id]/page.tsx` shows versions | `GET /governance/policies/{id}/versions` | `policy_versions` table with `UNIQUE(policy_id, version)` | COMPLETE | None | -- |
| **Policy Diff** | `policies/[id]/diff/page.tsx` | `GET /governance/policies/{id}/diff?v1=X&v2=Y` | Computed from `policy_versions` content | COMPLETE | None | -- |
| **Attestation Campaigns** | `policies/[id]/attestations/page.tsx`, `useLaunchCampaign` hook | `POST /governance/policies/{id}/attestation-campaigns` | `attestation_campaigns` table | COMPLETE | No email notifications sent to target users | Integrate NATS notification on campaign launch |
| **Policy Attestation** | `useAttestPolicy`, `useAttestationStatus` hooks | `POST /governance/attestations/{id}/attest`, `GET /governance/policies/{id}/attestation-status` | `policy_attestations` table | COMPLETE | No reminder/nudge mechanism | Add scheduled attestation reminders |
| **RACI CRUD** | `raci/page.tsx`, `raci/new/page.tsx`, `raci/[id]/page.tsx` | `POST/GET/PUT/DELETE /governance/raci` | `raci_matrices`, `raci_entries` tables | COMPLETE | None | -- |
| **RACI Entry Management** | Inline in `raci/[id]/page.tsx` | `POST/PUT/DELETE /governance/raci/{id}/entries` and `/governance/raci/entries/{id}` | `raci_entries` table | COMPLETE | None | -- |
| **RACI Coverage Analysis** | `useRACICoverageReport`, `useRACICoverageSummary` hooks | `GET /governance/raci/{id}/coverage`, `GET /governance/raci/coverage-summary` | Computed from `raci_entries` | COMPLETE | No visual gap heatmap on frontend | Add coverage heatmap visualization |
| **Meeting CRUD** | `meetings/page.tsx`, `meetings/new/page.tsx`, `meetings/[id]/page.tsx` | `POST/GET/PUT /governance/meetings` | `meetings` table | COMPLETE | No delete endpoint for meetings | Add soft-delete for meetings |
| **Meeting Decisions** | Part of `meetings/[id]/page.tsx` | `POST/GET /governance/meetings/{id}/decisions` | `meeting_decisions` table | COMPLETE | None | -- |
| **Action Items** | `actions/page.tsx` | `POST/GET/PUT /governance/meetings/actions`, `POST /governance/meetings/actions/{id}/complete` | `action_items` table | COMPLETE | None | -- |
| **Overdue Actions** | `useOverdueActions`, `useOverdueActionStats`, `useMyOverdueActions` hooks | `GET /governance/meetings/actions/overdue\|overdue/stats\|overdue/mine` | Computed from `action_items.due_date` | COMPLETE | No automated email reminders | Integrate with action_reminder.go cron |
| **OKR CRUD** | `okrs/page.tsx`, `okrs/new/page.tsx`, `okrs/[id]/page.tsx` | `POST/GET/PUT /governance/okrs` | `okrs` table | COMPLETE | 1 failing test (nil pool) | Fix nil pool bug in OKR handler test |
| **OKR Trees** | `useOKRTree` hook | `GET /governance/okrs/{id}/tree` | `okrs.parent_id` self-reference | COMPLETE | None | -- |
| **Key Results** | Part of OKR detail page | `POST /governance/okrs/{id}/key-results`, `PUT/DELETE /governance/key-results/{id}` | `key_results` table | COMPLETE | None | -- |
| **KPI Management** | `useKPIs`, `useCreateKPI`, `useUpdateKPI`, `useDeleteKPI` hooks | `POST/GET/PUT/DELETE /governance/kpis` | `kpis` table | COMPLETE | No dedicated KPI dashboard page | Build KPI dashboard with charts |
| **Approvals Hub** | `approvals/page.tsx` | Cross-module approval queries | `approvals` table (migration 004) | PARTIAL | Generic approvals page; not governance-specific workflow | Integrate policy approvals with approval engine |
| **File Uploads** | Not implemented | Not implemented | `documents` table exists (migration 005) but not wired to governance | MISSING | No evidence attachment for policies or meetings | Wire MinIO uploads to policy evidence |
| **Notification Integration** | Not implemented | `action_reminder.go` exists | NATS infrastructure in place | PARTIAL | action_reminder.go exists but no email delivery | Complete NATS -> email pipeline |

---

## 4. UI / API / DB Mapping

### 4.1 Frontend Pages (13 pages)

| Page | Route | Purpose |
|---|---|---|
| Governance Hub | `/dashboard/governance/page.tsx` | Module landing with summary cards |
| Policies List | `/dashboard/governance/policies/page.tsx` | Paginated policy list with filters |
| New Policy | `/dashboard/governance/policies/new/page.tsx` | Policy creation form |
| Policy Detail | `/dashboard/governance/policies/[id]/page.tsx` | Policy view with version history |
| Edit Policy | `/dashboard/governance/policies/[id]/edit/page.tsx` | Policy edit form |
| Policy Diff | `/dashboard/governance/policies/[id]/diff/page.tsx` | Side-by-side version comparison |
| Attestations | `/dashboard/governance/policies/[id]/attestations/page.tsx` | Campaign management and attestation tracking |
| RACI List | `/dashboard/governance/raci/page.tsx` | RACI matrices list |
| New RACI | `/dashboard/governance/raci/new/page.tsx` | RACI creation form |
| RACI Detail | `/dashboard/governance/raci/[id]/page.tsx` | Matrix view with entries |
| Meetings List | `/dashboard/governance/meetings/page.tsx` | Meeting list with filters |
| New Meeting | `/dashboard/governance/meetings/new/page.tsx` | Meeting creation form |
| Meeting Detail | `/dashboard/governance/meetings/[id]/page.tsx` | Meeting with decisions and actions |
| OKRs List | `/dashboard/governance/okrs/page.tsx` | OKR list with level/period/status filters |
| New OKR | `/dashboard/governance/okrs/new/page.tsx` | OKR creation form |
| OKR Detail | `/dashboard/governance/okrs/[id]/page.tsx` | OKR with key results and tree |
| Actions | `/dashboard/governance/actions/page.tsx` | Action items tracker |
| Approvals | `/dashboard/governance/approvals/page.tsx` | Pending approvals hub |

### 4.2 Backend Files (16 files)

| File | Purpose |
|---|---|
| `handler.go` | Route registration for all governance endpoints |
| `types.go` | Shared types and structs |
| `types_test.go` | Type validation tests |
| `policy_handler.go` | Policy HTTP handlers (CRUD + workflow transitions) |
| `policy_handler_test.go` | Policy handler unit tests |
| `policy_service.go` | Policy business logic and DB queries |
| `raci_handler.go` | RACI HTTP handlers (matrices + entries + coverage) |
| `raci_handler_test.go` | RACI handler unit tests |
| `raci_service.go` | RACI business logic and DB queries |
| `meeting_handler.go` | Meeting HTTP handlers (meetings + decisions + actions) |
| `meeting_handler_test.go` | Meeting handler unit tests |
| `meeting_service.go` | Meeting business logic and DB queries |
| `okr_handler.go` | OKR HTTP handlers (OKRs + key results + KPIs) |
| `okr_handler_test.go` | OKR handler unit tests |
| `okr_service.go` | OKR business logic and DB queries |
| `action_reminder.go` | Scheduled action item reminder worker |

### 4.3 Database Tables (12 tables)

| Table | Migration | Key Columns | Indexes |
|---|---|---|---|
| `policies` | 007 | id, tenant_id, title, category, tags, status, version, content, effective/review/expiry_date, owner_id | tenant, status, category, owner, review_date |
| `policy_versions` | 007 | id, policy_id, version, title, content, changes_summary | policy_id; UNIQUE(policy_id, version) |
| `attestation_campaigns` | 007 | id, tenant_id, policy_id, policy_version, target_scope, target_user_ids, due_date, status, completion_rate | tenant, policy, status |
| `policy_attestations` | 007 | id, campaign_id, user_id, status, attested_at | campaign_id, user_id |
| `raci_matrices` | 007 | id, tenant_id, name, description, process_area | tenant |
| `raci_entries` | 007 | id, matrix_id, activity, user_id, role (R/A/C/I) | matrix_id |
| `meetings` | 007 | id, tenant_id, title, type, status, scheduled_date, location, attendees | tenant, status |
| `meeting_decisions` | 007 | id, meeting_id, decision_text, decided_by | meeting_id |
| `action_items` | 007 | id, tenant_id, meeting_id, title, description, owner_id, status, due_date | tenant, meeting_id, owner_id, status |
| `okrs` | 007 | id, tenant_id, parent_id, title, level, period, status, progress | tenant, level, period |
| `key_results` | 007 | id, okr_id, title, target_value, current_value, unit | okr_id |
| `kpis` | 007 | id, tenant_id, name, description, target, actual, unit, frequency | tenant |

### 4.4 React Query Hooks (29 hooks)

| Hook | API Endpoint | Type |
|---|---|---|
| `usePolicies` | `GET /governance/policies` | Query |
| `usePolicy` | `GET /governance/policies/{id}` | Query |
| `usePolicyVersions` | `GET /governance/policies/{id}/versions` | Query |
| `usePolicyDiff` | `GET /governance/policies/{id}/diff` | Query |
| `useAttestationStatus` | `GET /governance/policies/{id}/attestation-status` | Query |
| `useCreatePolicy` | `POST /governance/policies` | Mutation |
| `useUpdatePolicy` | `PUT /governance/policies/{id}` | Mutation |
| `useSubmitPolicy` | `POST /governance/policies/{id}/submit` | Mutation |
| `useApprovePolicy` | `POST /governance/policies/{id}/approve` | Mutation |
| `usePublishPolicy` | `POST /governance/policies/{id}/publish` | Mutation |
| `useRetirePolicy` | `POST /governance/policies/{id}/retire` | Mutation |
| `useLaunchCampaign` | `POST /governance/policies/{id}/attestation-campaigns` | Mutation |
| `useAttestPolicy` | `POST /governance/attestations/{id}/attest` | Mutation |
| `useRACIMatrices` | `GET /governance/raci` | Query |
| `useRACIMatrix` | `GET /governance/raci/{id}` | Query |
| `useCreateRACIMatrix` | `POST /governance/raci` | Mutation |
| `useUpdateRACIMatrix` | `PUT /governance/raci/{id}` | Mutation |
| `useDeleteRACIMatrix` | `DELETE /governance/raci/{id}` | Mutation |
| `useAddRACIEntry` | `POST /governance/raci/{id}/entries` | Mutation |
| `useUpdateRACIEntry` | `PUT /governance/raci/entries/{id}` | Mutation |
| `useDeleteRACIEntry` | `DELETE /governance/raci/entries/{id}` | Mutation |
| `useRACICoverageReport` | `GET /governance/raci/{id}/coverage` | Query |
| `useRACICoverageSummary` | `GET /governance/raci/coverage-summary` | Query |
| `useMeetings` | `GET /governance/meetings` | Query |
| `useMeeting` | `GET /governance/meetings/{id}` | Query |
| `useMeetingDecisions` | `GET /governance/meetings/{id}/decisions` | Query |
| `useCreateMeeting` | `POST /governance/meetings` | Mutation |
| `useUpdateMeeting` | `PUT /governance/meetings/{id}` | Mutation |
| `useCreateDecision` | `POST /governance/meetings/{id}/decisions` | Mutation |
| `useActionItems` | `GET /governance/meetings/actions` | Query |
| `useOverdueActions` | `GET /governance/meetings/actions/overdue` | Query |
| `useCreateActionItem` | `POST /governance/meetings/actions` | Mutation |
| `useUpdateActionItem` | `PUT /governance/meetings/actions/{id}` | Mutation |
| `useCompleteAction` | `POST /governance/meetings/actions/{id}/complete` | Mutation |
| `useOverdueActionStats` | `GET /governance/meetings/actions/overdue/stats` | Query |
| `useMyOverdueActions` | `GET /governance/meetings/actions/overdue/mine` | Query |
| `useOKRs` | `GET /governance/okrs` | Query |
| `useOKR` | `GET /governance/okrs/{id}` | Query |
| `useOKRTree` | `GET /governance/okrs/{id}/tree` | Query |
| `useCreateOKR` | `POST /governance/okrs` | Mutation |
| `useUpdateOKR` | `PUT /governance/okrs/{id}` | Mutation |
| `useCreateKeyResult` | `POST /governance/okrs/{id}/key-results` | Mutation |
| `useUpdateKeyResult` | `PUT /governance/key-results/{id}` | Mutation |
| `useDeleteKeyResult` | `DELETE /governance/key-results/{id}` | Mutation |
| `useKPIs` | `GET /governance/kpis` | Query |
| `useCreateKPI` | `POST /governance/kpis` | Mutation |
| `useUpdateKPI` | `PUT /governance/kpis/{id}` | Mutation |
| `useDeleteKPI` | `DELETE /governance/kpis/{id}` | Mutation |

---

## 5. Workflow / State Machine Coverage

### 5.1 Policy Status Workflow

```
draft --> in_review --> approved --> published --> retired
  ^           |
  |           v
  +------- rejected (NOT IMPLEMENTED)
```

**Implemented transitions:**
- `draft` -> `in_review` (via `/submit`)
- `in_review` -> `approved` (via `/approve`)
- `approved` -> `published` (via `/publish`)
- `published` -> `retired` (via `/retire`)

**Missing transitions:**
- `in_review` -> `draft` (reject/return for revision)
- `published` -> `in_review` (re-review for updates)

### 5.2 Action Item Status Workflow

```
open --> in_progress --> completed
                    --> overdue (computed from due_date)
```

---

## 6. Security & Tenancy Review

| Check | Status | Notes |
|---|---|---|
| Tenant ID filtering in queries | PRESENT | All queries include `tenant_id` from JWT context |
| Row-Level Security (RLS) | MISSING | No PostgreSQL RLS policies on governance tables |
| Authorization checks | PARTIAL | Handlers extract tenant from JWT but do not enforce role-based access |
| Owner-only edit | NOT ENFORCED | Any user in the tenant can edit any policy |
| Audit trail | PARTIAL | `created_by`, `created_at`, `updated_at` columns exist; no `audit_events` integration |
| CSRF protection | PRESENT | API uses JWT Bearer tokens (no cookies) |
| Input validation | PRESENT | Handler-level validation on required fields |

---

## 7. Data Model Coverage

### 7.1 Seed Data Assessment

| Data Type | Seeded | Count | Quality |
|---|---|---|---|
| Policies | YES | 20 | Realistic titles, categories, and content for AMD context |
| RACI Matrices | YES | 10 | Mapped to real staff IDs with 56 entries |
| Meetings | NO | 0 | No seed meetings exist |
| OKRs | NO | 0 | No seed OKRs exist |
| KPIs | NO | 0 | No seed KPIs exist |
| Action Items | NO | 0 | No seed action items exist |

### 7.2 Data Integrity

| Check | Status |
|---|---|
| Foreign key constraints | PRESENT on all reference columns |
| Unique constraints | `policy_versions(policy_id, version)` |
| NOT NULL enforcement | Applied on required fields |
| Default values | Status defaults, timestamps, version defaults |
| Cascading deletes | `ON DELETE CASCADE` on policy_versions, attestation_campaigns |
| Updated_at triggers | `fn_update_timestamp()` triggers on policies table |

---

## 8. Notification / Reporting / Search Integration

| Integration | Status | Details |
|---|---|---|
| **Notifications** | PARTIAL | `action_reminder.go` exists as a cron worker but does not send actual emails; NATS infrastructure available but not wired |
| **Reporting** | NOT INTEGRATED | No governance-specific reports in the reporting module |
| **Search** | NOT INTEGRATED | No full-text search on policies or meeting decisions |
| **Activity Panel** | NOT VERIFIED | Activity panel hook exists but governance events not confirmed as emitters |

---

## 9. Known Defects & Risks

| # | Severity | Description | Impact | File/Location |
|---|---|---|---|---|
| 1 | **HIGH** | OKR handler test fails with nil pool error | Test suite unreliable; CI would fail | `okr_handler_test.go` |
| 2 | **MEDIUM** | No policy rejection/revert workflow | Reviewers cannot send policies back for revision | `policy_handler.go` |
| 3 | **MEDIUM** | No file upload for policy evidence | Compliance evidence cannot be attached | Module-wide |
| 4 | **MEDIUM** | Attestation campaigns do not trigger notifications | Users unaware they need to attest | `action_reminder.go` |
| 5 | **MEDIUM** | No role-based authorization enforcement | Any tenant user can approve/publish policies | All handlers |
| 6 | **LOW** | No meeting deletion capability | Cancelled meetings cannot be removed | `meeting_handler.go` |
| 7 | **LOW** | No seed data for OKRs, KPIs, meetings | Demo/UAT scenarios incomplete for these sub-features | Seed migrations |
| 8 | **LOW** | KPI management has no dedicated frontend page | KPIs only manageable via hooks (no standalone page) | Frontend gap |

---

## 10. What Must Be Built Next (Priority Order)

| Priority | Item | Effort | Rationale |
|---|---|---|---|
| **P0** | Fix OKR nil pool test failure | 1 hour | Unblocks test suite and CI |
| **P0** | Add role-based authorization checks to all handlers | 2 days | Security requirement for UAT |
| **P1** | Implement policy reject/revert transitions | 1 day | Required for realistic approval workflow |
| **P1** | Wire attestation campaign notifications via NATS | 1 day | Users must be notified to complete attestations |
| **P1** | Integrate file upload for policy evidence | 2 days | MinIO infrastructure already exists; needs wiring |
| **P2** | Build KPI dashboard page | 1 day | KPI backend is complete; needs visualization |
| **P2** | Add governance reports to reporting module | 2 days | Policy compliance, attestation rates, overdue actions |
| **P2** | Seed OKRs, KPIs, and meetings for demo | 0.5 day | Completes the demo data story |
| **P3** | Add full-text search on policies | 1 day | PostgreSQL `tsvector` or pg_trgm index |
| **P3** | Implement meeting soft-delete | 0.5 day | Low-impact quality-of-life improvement |

---

*This audit was conducted against the `dev` branch. All findings reflect the codebase state at the time of analysis and should be re-validated after remediation.*

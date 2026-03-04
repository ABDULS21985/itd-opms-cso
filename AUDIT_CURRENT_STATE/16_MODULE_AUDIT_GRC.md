# Module Audit: GRC (Governance, Risk & Compliance)

**Audit Date:** 2026-03-02
**Module Completion:** 85%
**Overall Assessment:** Comprehensive risk, audit, compliance, and access review infrastructure; missing automated scoring, file uploads, bulk operations, and remediation workflows

---

## 1. Module Purpose

The GRC module provides integrated governance, risk management, and compliance capabilities including: a risk register with 5x5 heat map scoring, audit management with findings and evidence collection, access review campaigns with per-entry decisions, and multi-framework compliance controls tracking. It supports regulatory frameworks relevant to Nigerian banking (CBN IT Standards/Guidelines, ISO 27001, COBIT, NIST, PCI-DSS, SOC2, NDPR).

---

## 2. Architecture Overview

### 2.1 Backend Structure

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Handler (root) | `handler.go` | 51 | Composes sub-handlers for risk, audit, access review, compliance |
| Risk Handler | `risk_handler.go` | 318 | HTTP handlers for risk register + assessments |
| Risk Service | `risk_service.go` | 648 | Business logic for risk scoring, heat map, escalation |
| Audit Management Handler | `grc_audit_handler.go` | 501 | HTTP handlers for audits, findings, evidence |
| Audit Management Service | `grc_audit_service.go` | 864 | Business logic for audit lifecycle + evidence |
| Access Review Handler | `access_review_handler.go` | 248 | HTTP handlers for campaigns + entries |
| Access Review Service | `access_review_service.go` | 442 | Business logic for access review decisions |
| Compliance Handler | `compliance_handler.go` | 188 | HTTP handlers for compliance controls |
| Compliance Service | `compliance_service.go` | 333 | Business logic for multi-framework compliance |
| Types | `types.go` | 485 | Domain types, 60+ constants, request/response structs |
| **Total Production** | **10 files** | **4,078** | |
| Tests | 5 test files | 4,225 | Handler + types tests |
| **Total Module** | **15 files** | **8,303** | |

### 2.2 Frontend Structure

| Page | Path | Purpose |
|------|------|---------|
| Hub | `/dashboard/grc/page.tsx` | GRC module landing with summary stats |
| Risk List | `/dashboard/grc/risks/page.tsx` | Risk register with heat map visualization |
| Risk Detail | `/dashboard/grc/risks/[id]/page.tsx` | Individual risk detail with assessment history |
| Audit List | `/dashboard/grc/audits/page.tsx` | Audit engagement listing |
| Audit Detail | `/dashboard/grc/audits/[id]/page.tsx` | Audit detail with findings |
| Evidence | `/dashboard/grc/audits/[id]/evidence/page.tsx` | Evidence collection for an audit |
| Compliance | `/dashboard/grc/compliance/page.tsx` | Multi-framework compliance dashboard |
| Access Reviews | `/dashboard/grc/access-reviews/page.tsx` | Access review campaigns listing |
| Reports | `/dashboard/grc/reports/page.tsx` | GRC reporting page |
| **Frontend Tests** | `__tests__/risks.test.tsx`, `__tests__/compliance.test.tsx` | Risk and compliance tests |

### 2.3 Database Schema (Migration 013)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `risks` | Risk register entries | id, tenant_id, risk_number, title, category (7 types), likelihood, impact, risk_score (computed), status (6 states), treatment_plan, contingency_plan, owner_id, reviewer_id, linked_project_id, linked_audit_id, escalation_threshold |
| `risk_assessments` | Point-in-time risk assessments | id, risk_id, assessed_by, previous_likelihood, previous_impact, new_likelihood, new_impact, rationale, evidence_refs (UUID[]) |
| `audits` | Audit engagements | id, tenant_id, title, audit_type (3 types), scope, auditor, audit_body, status (5 states), scheduled_start, scheduled_end, evidence_requirements (JSONB), readiness_score |
| `audit_findings` | Findings from audits | id, audit_id, tenant_id, finding_number, title, severity (4 levels), status (5 states), remediation_plan, owner_id, due_date, evidence_of_remediation (UUID[]) |
| `evidence_collections` | Evidence artifact groups | id, audit_id, tenant_id, title, status (5 states), evidence_item_ids (UUID[]), collector_id, reviewer_id, approved_at, checksum |
| `access_review_campaigns` | Periodic access review campaigns | id, tenant_id, title, scope, status (4 states), reviewer_ids (UUID[]), due_date, completion_rate |
| `access_review_entries` | Individual access review decisions | id, campaign_id, tenant_id, user_id, role_id, reviewer_id, decision (3 options), justification, exception_expiry |
| `compliance_controls` | Framework compliance controls | id, tenant_id, framework (7 frameworks), control_id, control_name, implementation_status (4 states), evidence_refs (UUID[]), owner_id, last_assessed_at |

**Total: 8 tables**

---

## 3. Feature-by-Feature Capability Audit

| # | Capability | Frontend Evidence | API Evidence | DB Evidence | Status | Gaps | Recommended Next Action |
|---|-----------|-------------------|--------------|-------------|--------|------|------------------------|
| 1 | Risk Register CRUD | `risks/page.tsx`, `risks/[id]/page.tsx` | `GET/POST/PUT/DELETE /risks` in `risk_handler.go` | `risks` table with all fields | COMPLETE | None | -- |
| 2 | Risk Heat Map (5x5) | Heat map visualization on risk list page | `GET /risks/heat-map` returns `[]RiskHeatMapEntry` | Aggregate query by likelihood x impact | COMPLETE | None | -- |
| 3 | Risk Scoring | Score displayed on risk detail | `risk_score` computed from likelihood x impact in service | `risk_score INT` column | COMPLETE | Score calculation is in service layer, not DB trigger | Consider DB trigger for consistency |
| 4 | Risk Assessment History | Assessment history on risk detail page | `POST /risks/{id}/assess`, `GET /risks/{id}/assessments` | `risk_assessments` table with previous/new values | COMPLETE | None | -- |
| 5 | Risk Escalation | Escalation action on risk detail | `POST /risks/{id}/escalate` | `escalation_threshold INT`, `status = 'escalated'` | COMPLETE | No notification on escalation | Wire escalation to notification module |
| 6 | Risks Needing Review | Review queue filtering | `GET /risks/review-needed` | `next_review_date` column filtering | COMPLETE | None | -- |
| 7 | Risk Categories | Category filter on risk list | 7 categories: operational, strategic, financial, compliance, technology, security, reputation | `category TEXT` column | COMPLETE | None | -- |
| 8 | Risk Linking (Project/Audit) | Link display on risk detail | `linked_project_id`, `linked_audit_id` fields | UUID FK columns | COMPLETE | None | -- |
| 9 | Audit Engagements CRUD | `audits/page.tsx`, `audits/[id]/page.tsx` | `GET/POST/PUT/DELETE /audits` | `audits` table with 3 audit types, 5 statuses | COMPLETE | None | -- |
| 10 | Audit Types | Type filter on audit list | `AuditTypeInternal/External/Regulatory` constants | `audit_type TEXT` column | COMPLETE | None | -- |
| 11 | Audit Status Workflow | Status display on audit detail | Status updated via `PUT /audits/{id}` | `status CHECK (planned, preparing, in_progress, findings_review, completed)` | COMPLETE | No formal state transition validation | Add audit status state machine |
| 12 | Audit Findings CRUD | Findings section on audit detail | `GET/POST/PUT /audits/{auditId}/findings`, `POST /audits/{auditId}/findings/{findingId}/close` | `audit_findings` table with severity + status | COMPLETE | None | -- |
| 13 | Finding Severity | Severity badges on findings | 4 levels: low, medium, high, critical | `severity TEXT` column | COMPLETE | None | -- |
| 14 | Finding Status Workflow | Status display on findings | 5 states: open, remediation_planned, in_remediation, closed, accepted | `status TEXT` column | COMPLETE | No remediation workflow automation | Build remediation tracking |
| 15 | Evidence Collections CRUD | `audits/[id]/evidence/page.tsx` | `GET/POST/PUT /audits/{auditId}/evidence` | `evidence_collections` table with approval workflow | COMPLETE | None | -- |
| 16 | Evidence Approval | Approval action on evidence page | `POST /audits/{auditId}/evidence/{evidenceId}/approve` | `approved_at`, `reviewer_id` columns | COMPLETE | None | -- |
| 17 | Evidence File Upload Integration | None (evidence IDs referenced only) | `evidence_item_ids UUID[]` stores references | UUID array, no file storage integration | PARTIAL | Evidence items are referenced by ID but actual file upload is not integrated | Wire to document/file upload service |
| 18 | Readiness Score | Score displayed on audit detail | `GET /audits/{id}/readiness` | `readiness_score FLOAT` column | PARTIAL | Score is stored but not auto-calculated | Implement automated readiness scoring |
| 19 | Access Review Campaigns CRUD | `access-reviews/page.tsx` | `GET/POST/PUT /access-reviews` | `access_review_campaigns` with reviewer_ids (UUID[]) | COMPLETE | None | -- |
| 20 | Access Review Entries | Entry list within campaigns | `GET/POST /access-reviews/{campaignId}/entries` | `access_review_entries` table | COMPLETE | None | -- |
| 21 | Access Review Decisions | Decision actions on entries | `POST /access-reviews/{campaignId}/entries/{entryId}/decide` | `decision` (approved/revoked/exception), `justification`, `exception_expiry` | COMPLETE | None | -- |
| 22 | Bulk Access Review Import | None | None | None | MISSING | No bulk import of user-role pairs for review | Build CSV/bulk import endpoint |
| 23 | Compliance Controls CRUD | `compliance/page.tsx` | `GET/POST/PUT/DELETE /compliance` | `compliance_controls` with 7 frameworks | COMPLETE | None | -- |
| 24 | Multi-Framework Support | Framework filter on compliance page | 7 frameworks: ISO_27001, NIST_CSF, COBIT, PCI_DSS, SOC2, NDPR, CBN_IT_GUIDELINES | `framework TEXT` column | COMPLETE | None | -- |
| 25 | Compliance Implementation Status | Status badges on controls | 4 states: not_started, partial, implemented, verified | `implementation_status TEXT` column | COMPLETE | None | -- |
| 26 | Compliance Stats | Stats summary on compliance page | `GET /compliance/stats` returns `ComplianceStats` | Aggregate query by framework | COMPLETE | None | -- |
| 27 | Automated Readiness Score | None | None (manual readiness_score field) | `readiness_score FLOAT` stored manually | MISSING | Readiness score must be manually entered | Implement auto-calculation from evidence/controls |
| 28 | Compliance Remediation Workflow | None | None | None | MISSING | No workflow for tracking control remediation actions | Build remediation tracking with assignees and due dates |
| 29 | Risk Treatment Workflow UI | Treatment plan text field only | `treatment_plan TEXT` on risk model | `treatment_plan TEXT` column | PARTIAL | Treatment plan is free text, no structured workflow | Build treatment action items with tracking |
| 30 | GRC Reports | `reports/page.tsx` (frontend exists) | No dedicated GRC report handler | -- | PARTIAL | Frontend page exists, relies on reporting module charts | Evaluate if dedicated handler needed |

---

## 4. API Route Registry

### Risk Routes (`/api/v1/grc/risks`)
```
GET    /                    ListRisks               grc.view
GET    /heat-map            GetRiskHeatMap           grc.view
GET    /review-needed       GetRisksNeedingReview    grc.view
GET    /{id}                GetRisk                  grc.view
POST   /                    CreateRisk               grc.manage
PUT    /{id}                UpdateRisk               grc.manage
DELETE /{id}                DeleteRisk               grc.manage
POST   /{id}/assess         CreateRiskAssessment     grc.manage
GET    /{id}/assessments    ListRiskAssessments      grc.view
POST   /{id}/escalate       EscalateRisk             grc.manage
```

### Audit Routes (`/api/v1/grc/audits`)
```
GET    /                    ListAudits               grc.view
GET    /{id}                GetAudit                 grc.view
POST   /                    CreateAudit              grc.manage
PUT    /{id}                UpdateAudit              grc.manage
DELETE /{id}                DeleteAudit              grc.manage
GET    /{id}/readiness      GetReadinessScore        grc.view
```

### Findings Routes (`/api/v1/grc/audits/{auditId}/findings`)
```
GET    /                    ListFindings             grc.view
GET    /{findingId}         GetFinding               grc.view
POST   /                    CreateFinding            grc.manage
PUT    /{findingId}         UpdateFinding            grc.manage
POST   /{findingId}/close   CloseFinding             grc.manage
```

### Evidence Routes (`/api/v1/grc/audits/{auditId}/evidence`)
```
GET    /                    ListEvidenceCollections  grc.view
GET    /{evidenceId}        GetEvidenceCollection    grc.view
POST   /                    CreateEvidenceCollection grc.manage
PUT    /{evidenceId}        UpdateEvidenceCollection grc.manage
POST   /{evidenceId}/approve ApproveEvidenceCollection grc.manage
```

### Access Review Routes (`/api/v1/grc/access-reviews`)
```
GET    /                    ListCampaigns            grc.view
GET    /{id}                GetCampaign              grc.view
POST   /                    CreateCampaign           grc.manage
PUT    /{id}                UpdateCampaign           grc.manage
GET    /{campaignId}/entries ListEntries             grc.view
POST   /{campaignId}/entries CreateEntry             grc.manage
POST   /{campaignId}/entries/{entryId}/decide RecordDecision grc.manage
```

### Compliance Routes (`/api/v1/grc/compliance`)
```
GET    /                    ListControls             grc.view
GET    /stats               GetComplianceStats       grc.view
GET    /{id}                GetControl               grc.view
POST   /                    CreateControl            grc.manage
PUT    /{id}                UpdateControl            grc.manage
DELETE /{id}                DeleteControl            grc.manage
```

**Total API Endpoints: 38**

---

## 5. Security and Tenancy Review

### 5.1 RBAC Implementation
- **Permissions defined:** `grc.view`, `grc.manage`
- **Enforcement method:** `middleware.RequirePermission()` applied via Chi `.With()` on every route
- **FINDING:** RBAC IS enforced at the route level in all handlers. Every route uses `r.With(middleware.RequirePermission(...))`.
- **Correction to initial assessment:** The initial data stated "NOT enforced in middleware" -- this is INCORRECT. Code evidence confirms all 38 routes have `middleware.RequirePermission` applied.

### 5.2 Tenant Isolation
- All domain types include `TenantID uuid.UUID` field
- All 8 tables include `tenant_id` column
- `risks` has `REFERENCES tenants(id)` FK constraint
- Service layer extracts tenant from `AuthContext` for all queries

### 5.3 Audit Trail Integration
- Handler constructor accepts `*audit.AuditService`
- All four service constructors wire audit service
- Risk assessments create explicit historical records
- Evidence collections have checksum and approval tracking

### 5.4 Input Validation
- Request structs use `validate:"required"` tags extensively
- Database-level CHECK constraints enforce valid enum values for risk status, likelihood, impact, audit type, finding severity, etc.
- Risk score is computed server-side (not user-supplied)

### 5.5 Evidence Integrity
- `checksum` field on `evidence_collections` supports integrity verification
- `approved_at` timestamp provides tamper detection
- `evidence_refs UUID[]` on compliance controls creates audit trail linkage

---

## 6. Data Model Coverage

### 6.1 Risk Scoring Model

**Likelihood Scale:** very_low (1), low (2), medium (3), high (4), very_high (5)
**Impact Scale:** very_low (1), low (2), medium (3), high (4), very_high (5)
**Risk Score:** likelihood x impact (computed in service, stored as INT)
**Heat Map:** 5x5 grid with count per cell via `RiskHeatMapEntry`

### 6.2 Risk Status Lifecycle
```
identified --> assessed --> mitigating --> accepted/closed
                        \-> escalated
```
**Statuses:** identified, assessed, mitigating, accepted, closed, escalated

### 6.3 Audit Status Lifecycle
```
planned --> preparing --> in_progress --> findings_review --> completed
```

### 6.4 Finding Status Lifecycle
```
open --> remediation_planned --> in_remediation --> closed
                                               \-> accepted
```

### 6.5 Evidence Collection Status Lifecycle
```
pending --> collecting --> review --> approved/submitted
```

### 6.6 Access Review Campaign Status
```
planned --> active --> review --> completed
```

### 6.7 Access Review Decisions
Three options: approved, revoked, exception (with `exception_expiry` date)

### 6.8 Compliance Frameworks
Seven supported frameworks: ISO_27001, NIST_CSF, COBIT, PCI_DSS, SOC2, NDPR, CBN_IT_GUIDELINES

### 6.9 Compliance Implementation Status
Four states: not_started, partial, implemented, verified

---

## 7. Workflow / State Machine Coverage

| Workflow | States Defined | Transitions Validated | UI Support | Backend Support |
|----------|---------------|----------------------|------------|----------------|
| Risk Status | 6 states | No formal validation (any status via update) | Yes (status dropdown) | Yes (via update) |
| Risk Assessment | Snapshot-based (not stateful) | N/A | Yes (assess form) | Yes (`CreateRiskAssessment`) |
| Audit Status | 5 states | No formal validation | Yes (status dropdown) | Yes (via update) |
| Finding Status | 5 states | Partial (`CloseFinding` endpoint) | Yes (status + close button) | Yes |
| Evidence Status | 5 states | Partial (`ApproveEvidenceCollection`) | Yes | Yes |
| Access Review Campaign | 4 states | No formal validation | Yes | Yes |
| Access Review Decision | 3 options | Enforced via `RecordDecision` | Yes | Yes |
| Compliance Status | 4 states | No formal validation | Yes | Yes |

**Note:** Most GRC workflows lack formal state machine transition validation. Status changes are accepted via update endpoints without checking whether the transition is valid.

---

## 8. Notification / Reporting / Search Integration

| Integration | Status | Evidence |
|-------------|--------|----------|
| Risk Heat Map Chart | Implemented | `risks-by-category` chart in reporting module |
| Executive Dashboard | Implemented | `mv_executive_summary` includes `high_risks`, `critical_risks`, `audit_readiness_score`, `access_review_completion_pct` |
| Risk Escalation Notification | NOT implemented | Escalation changes status but does not send notification |
| Audit Readiness Reporting | Partial | Readiness score stored but not auto-calculated |
| Compliance Stats | Implemented | `GET /compliance/stats` aggregates by framework |
| Finding Due Date Alerts | NOT implemented | `due_date` tracked but no alert when overdue |
| Access Review Reminders | NOT implemented | `due_date` on campaigns but no reminder notifications |
| Global Search | NOT directly integrated | GRC entities not included in global search |

---

## 9. Test Coverage

| Test File | Lines | Scope |
|-----------|-------|-------|
| `risk_handler_test.go` | 552 | Risk CRUD, heat map, assessment, escalation |
| `grc_audit_handler_test.go` | 822 | Audit CRUD, findings CRUD, evidence CRUD, approval |
| `access_review_handler_test.go` | 499 | Campaign CRUD, entries, decisions |
| `compliance_handler_test.go` | 396 | Control CRUD, stats, framework filtering |
| `types_test.go` | 1,956 | All constants, request validation, type coverage |
| **Total** | **4,225** | |

---

## 10. Known Defects and Risks

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | No automated readiness score calculation | High | Audit readiness must be manually estimated, reducing confidence in readiness assessments |
| 2 | Evidence file upload not integrated | High | Evidence items are referenced by UUID but no file upload mechanism exists; auditors cannot attach files |
| 3 | No bulk access review import | Medium | Large organizations cannot efficiently import user-role pairs for review; must create entries one at a time |
| 4 | No compliance remediation workflow | Medium | When a control is non-compliant, there is no structured way to track remediation actions |
| 5 | Risk treatment is free text only | Medium | Treatment plans are text fields with no structured action tracking, assignment, or due dates |
| 6 | No formal state machine validation for most workflows | Medium | Status changes are accepted without transition validation, allowing invalid state transitions |
| 7 | No escalation notification dispatch | Medium | Risk escalation changes status but does not notify stakeholders |
| 8 | No overdue finding alerts | Medium | Findings past due date are not flagged or escalated |
| 9 | GRC entities not in global search | Low | Users cannot find risks, audits, or controls via global search |
| 10 | Readiness score recalculated nowhere | Medium | The readiness score field is set manually and never auto-computed |

---

## 11. What Must Be Built Next (Priority Order)

1. **Automated Readiness Score Calculation** -- Compute readiness score from evidence collection status, findings closure rate, and compliance control implementation status
2. **Evidence File Upload Integration** -- Wire `evidence_item_ids` to the platform's document/file upload service (migration 005 `evidence_items` table exists)
3. **Bulk Access Review Import** -- Build CSV/Excel import endpoint for user-role pairs to populate access review campaigns
4. **Compliance Remediation Workflow** -- Add remediation action items with assignees, due dates, and status tracking per non-compliant control
5. **Risk Treatment Action Tracking** -- Structure treatment plans into discrete actions with assignees, milestones, and completion tracking
6. **State Machine Validation** -- Add formal state transition validation for risk, audit, finding, evidence, and campaign status changes
7. **Escalation Notification Dispatch** -- Wire risk escalation to notification module for email/push delivery
8. **Overdue Finding Alerts** -- Build scheduled job to flag findings past their due date and notify owners
9. **GRC Global Search Integration** -- Include risks, audits, findings, and controls in the reporting module's global search
10. **Access Review Completion Auto-Update** -- Auto-calculate `completion_rate` on campaigns when entries get decisions

---

## 12. File Reference Index

### Backend (Go)
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/risk_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/risk_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/grc_audit_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/grc_audit_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/access_review_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/access_review_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/compliance_handler.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/compliance_service.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/types.go`

### Tests
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/risk_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/grc_audit_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/access_review_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/compliance_handler_test.go`
- `/Users/mac/codes/itd-opms/itd-opms-api/internal/modules/grc/types_test.go`

### Frontend (Next.js)
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/risks/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/risks/[id]/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/audits/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/audits/[id]/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/audits/[id]/evidence/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/compliance/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/access-reviews/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/reports/page.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/__tests__/risks.test.tsx`
- `/Users/mac/codes/itd-opms/itd-opms-portal/app/dashboard/grc/__tests__/compliance.test.tsx`

### Database
- `/Users/mac/codes/itd-opms/itd-opms-api/migrations/013_grc.sql`

-- ──────────────────────────────────────────────
-- Risks
-- ──────────────────────────────────────────────

-- name: CreateRisk :one
INSERT INTO risks (
    tenant_id, risk_number, title, description, category,
    likelihood, impact, status, treatment_plan, contingency_plan,
    owner_id, escalation_threshold
)
VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    $11, $12
)
RETURNING *;

-- name: GetRisk :one
SELECT * FROM risks WHERE id = $1 AND tenant_id = $2;

-- name: ListRisks :many
SELECT * FROM risks
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR category = $3)
  AND ($4::uuid IS NULL OR owner_id = $4)
ORDER BY risk_score DESC
LIMIT $5 OFFSET $6;

-- name: CountRisks :one
SELECT COUNT(*)::int AS count FROM risks
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR category = $3)
  AND ($4::uuid IS NULL OR owner_id = $4);

-- name: UpdateRisk :one
UPDATE risks
SET title                = COALESCE($3, title),
    description          = COALESCE($4, description),
    category             = COALESCE($5, category),
    likelihood           = COALESCE($6, likelihood),
    impact               = COALESCE($7, impact),
    status               = COALESCE($8, status),
    treatment_plan       = COALESCE($9, treatment_plan),
    contingency_plan     = COALESCE($10, contingency_plan),
    owner_id             = COALESCE($11, owner_id),
    reviewer_id          = COALESCE($12, reviewer_id),
    next_review_date     = COALESCE($13, next_review_date),
    escalation_threshold = COALESCE($14, escalation_threshold)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteRisk :exec
DELETE FROM risks WHERE id = $1 AND tenant_id = $2;

-- name: GetRisksByScore :many
SELECT * FROM risks
WHERE tenant_id = $1
  AND risk_score >= $2
ORDER BY risk_score DESC;

-- name: GetRisksNeedingReview :many
SELECT * FROM risks
WHERE tenant_id = $1
  AND next_review_date <= $2::date
  AND status NOT IN ('closed', 'accepted')
ORDER BY next_review_date ASC;

-- name: GetRiskHeatMapData :many
SELECT likelihood, impact, COUNT(*)::int AS count
FROM risks
WHERE tenant_id = $1
  AND status NOT IN ('closed')
GROUP BY likelihood, impact;

-- name: EscalateRisk :exec
UPDATE risks SET status = 'escalated' WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Risk Assessments
-- ──────────────────────────────────────────────

-- name: CreateRiskAssessment :one
INSERT INTO risk_assessments (
    risk_id, assessed_by, assessment_date,
    previous_likelihood, previous_impact,
    new_likelihood, new_impact, rationale, evidence_refs
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListRiskAssessments :many
SELECT * FROM risk_assessments
WHERE risk_id = $1
ORDER BY assessment_date DESC
LIMIT $2 OFFSET $3;

-- name: GetLatestRiskAssessment :one
SELECT * FROM risk_assessments
WHERE risk_id = $1
ORDER BY assessment_date DESC
LIMIT 1;

-- name: CountRiskAssessments :one
SELECT COUNT(*)::int AS count FROM risk_assessments
WHERE risk_id = $1;

-- ──────────────────────────────────────────────
-- Audits
-- ──────────────────────────────────────────────

-- name: CreateAudit :one
INSERT INTO audits (
    tenant_id, title, audit_type, scope, auditor,
    audit_body, status, scheduled_start, scheduled_end,
    evidence_requirements, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetAudit :one
SELECT * FROM audits WHERE id = $1 AND tenant_id = $2;

-- name: ListAudits :many
SELECT * FROM audits
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR audit_type = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountAudits :one
SELECT COUNT(*)::int AS count FROM audits
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR audit_type = $3);

-- name: UpdateAudit :one
UPDATE audits
SET title                 = COALESCE($3, title),
    audit_type            = COALESCE($4, audit_type),
    scope                 = COALESCE($5, scope),
    status                = COALESCE($6, status),
    auditor               = COALESCE($7, auditor),
    audit_body            = COALESCE($8, audit_body),
    scheduled_start       = COALESCE($9, scheduled_start),
    scheduled_end         = COALESCE($10, scheduled_end),
    evidence_requirements = COALESCE($11, evidence_requirements),
    readiness_score       = COALESCE($12, readiness_score)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteAudit :exec
DELETE FROM audits WHERE id = $1 AND tenant_id = $2;

-- name: UpdateAuditReadinessScore :exec
UPDATE audits SET readiness_score = $2 WHERE id = $1;

-- name: ListUpcomingAudits :many
SELECT * FROM audits
WHERE tenant_id = $1
  AND scheduled_start > now()
  AND status IN ('planned', 'preparing')
ORDER BY scheduled_start ASC;

-- ──────────────────────────────────────────────
-- Audit Findings
-- ──────────────────────────────────────────────

-- name: CreateAuditFinding :one
INSERT INTO audit_findings (
    audit_id, tenant_id, finding_number, title, description,
    severity, status, remediation_plan, owner_id, due_date
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetAuditFinding :one
SELECT * FROM audit_findings WHERE id = $1 AND tenant_id = $2;

-- name: ListAuditFindings :many
SELECT * FROM audit_findings
WHERE audit_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY severity DESC, created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAuditFindings :one
SELECT COUNT(*)::int AS count FROM audit_findings
WHERE audit_id = $1
  AND ($2::text IS NULL OR status = $2);

-- name: UpdateAuditFinding :one
UPDATE audit_findings
SET title            = COALESCE($3, title),
    description      = COALESCE($4, description),
    severity         = COALESCE($5, severity),
    status           = COALESCE($6, status),
    remediation_plan = COALESCE($7, remediation_plan),
    owner_id         = COALESCE($8, owner_id),
    due_date         = COALESCE($9, due_date)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: CloseAuditFinding :exec
UPDATE audit_findings
SET status = 'closed', closed_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: GetFindingsByStatus :many
SELECT * FROM audit_findings
WHERE tenant_id = $1
  AND status = $2
ORDER BY due_date ASC NULLS LAST;

-- ──────────────────────────────────────────────
-- Evidence Collections
-- ──────────────────────────────────────────────

-- name: CreateEvidenceCollection :one
INSERT INTO evidence_collections (
    audit_id, tenant_id, title, description,
    status, evidence_item_ids, collector_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetEvidenceCollection :one
SELECT * FROM evidence_collections WHERE id = $1 AND tenant_id = $2;

-- name: ListEvidenceCollections :many
SELECT * FROM evidence_collections
WHERE audit_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC;

-- name: UpdateEvidenceCollection :one
UPDATE evidence_collections
SET title             = COALESCE($3, title),
    description       = COALESCE($4, description),
    status            = COALESCE($5, status),
    evidence_item_ids = COALESCE($6, evidence_item_ids),
    collector_id      = COALESCE($7, collector_id),
    reviewer_id       = COALESCE($8, reviewer_id),
    checksum          = COALESCE($9, checksum)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: ApproveEvidenceCollection :exec
UPDATE evidence_collections
SET status = 'approved', approved_at = now(), reviewer_id = $3
WHERE id = $1 AND tenant_id = $2;

-- name: SubmitEvidenceCollection :exec
UPDATE evidence_collections
SET status = 'submitted'
WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Access Review Campaigns
-- ──────────────────────────────────────────────

-- name: CreateAccessReviewCampaign :one
INSERT INTO access_review_campaigns (
    tenant_id, title, scope, status, reviewer_ids, due_date, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetAccessReviewCampaign :one
SELECT * FROM access_review_campaigns WHERE id = $1 AND tenant_id = $2;

-- name: ListAccessReviewCampaigns :many
SELECT * FROM access_review_campaigns
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAccessReviewCampaigns :one
SELECT COUNT(*)::int AS count FROM access_review_campaigns
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2);

-- name: UpdateAccessReviewCampaign :one
UPDATE access_review_campaigns
SET title        = COALESCE($3, title),
    scope        = COALESCE($4, scope),
    status       = COALESCE($5, status),
    reviewer_ids = COALESCE($6, reviewer_ids),
    due_date     = COALESCE($7, due_date)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateCampaignCompletionRate :exec
UPDATE access_review_campaigns
SET completion_rate = $2
WHERE id = $1;

-- ──────────────────────────────────────────────
-- Access Review Entries
-- ──────────────────────────────────────────────

-- name: CreateAccessReviewEntry :one
INSERT INTO access_review_entries (
    campaign_id, tenant_id, user_id, role_id
)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListAccessReviewEntries :many
SELECT * FROM access_review_entries
WHERE campaign_id = $1
  AND ($2::text IS NULL OR decision = $2)
ORDER BY created_at DESC;

-- name: RecordAccessReviewDecision :exec
UPDATE access_review_entries
SET decision         = $2,
    justification    = $3,
    exception_expiry = $4,
    decided_at       = now(),
    reviewer_id      = $5
WHERE id = $1;

-- name: CountCampaignEntries :one
SELECT COUNT(*)::int AS count FROM access_review_entries
WHERE campaign_id = $1;

-- name: CountDecidedEntries :one
SELECT COUNT(*)::int AS count FROM access_review_entries
WHERE campaign_id = $1
  AND decided_at IS NOT NULL;

-- ──────────────────────────────────────────────
-- Compliance Controls
-- ──────────────────────────────────────────────

-- name: CreateComplianceControl :one
INSERT INTO compliance_controls (
    tenant_id, framework, control_id, control_name,
    description, implementation_status, owner_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetComplianceControl :one
SELECT * FROM compliance_controls WHERE id = $1 AND tenant_id = $2;

-- name: ListComplianceControls :many
SELECT * FROM compliance_controls
WHERE tenant_id = $1
  AND ($2::text IS NULL OR framework = $2)
  AND ($3::text IS NULL OR implementation_status = $3)
ORDER BY framework, control_id
LIMIT $4 OFFSET $5;

-- name: CountComplianceControls :one
SELECT COUNT(*)::int AS count FROM compliance_controls
WHERE tenant_id = $1
  AND ($2::text IS NULL OR framework = $2)
  AND ($3::text IS NULL OR implementation_status = $3);

-- name: UpdateComplianceControl :one
UPDATE compliance_controls
SET control_name          = COALESCE($3, control_name),
    description           = COALESCE($4, description),
    implementation_status = COALESCE($5, implementation_status),
    evidence_refs         = COALESCE($6, evidence_refs),
    owner_id              = COALESCE($7, owner_id),
    last_assessed_at      = COALESCE($8, last_assessed_at)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteComplianceControl :exec
DELETE FROM compliance_controls WHERE id = $1 AND tenant_id = $2;

-- name: GetComplianceStats :many
SELECT
    framework,
    COUNT(*)::int AS total,
    SUM(CASE WHEN implementation_status IN ('implemented', 'verified') THEN 1 ELSE 0 END)::int AS compliant_count
FROM compliance_controls
WHERE tenant_id = $1
GROUP BY framework;

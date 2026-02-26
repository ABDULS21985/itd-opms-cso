-- ──────────────────────────────────────────────
-- Policies
-- ──────────────────────────────────────────────

-- name: CreatePolicy :one
INSERT INTO policies (tenant_id, title, description, category, tags, scope_type, scope_tenant_ids, content, effective_date, review_date, expiry_date, owner_id, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetPolicyByID :one
SELECT * FROM policies WHERE id = $1 AND tenant_id = $2;

-- name: ListPolicies :many
SELECT * FROM policies
WHERE tenant_id = $1
  AND ($2::text IS NULL OR category = $2)
  AND ($3::text IS NULL OR status = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountPolicies :one
SELECT COUNT(*) FROM policies
WHERE tenant_id = $1
  AND ($2::text IS NULL OR category = $2)
  AND ($3::text IS NULL OR status = $3);

-- name: UpdatePolicy :one
UPDATE policies
SET title = COALESCE($3, title),
    description = COALESCE($4, description),
    category = COALESCE($5, category),
    tags = COALESCE($6, tags),
    scope_type = COALESCE($7, scope_type),
    scope_tenant_ids = COALESCE($8, scope_tenant_ids),
    content = COALESCE($9, content),
    effective_date = COALESCE($10, effective_date),
    review_date = COALESCE($11, review_date),
    expiry_date = COALESCE($12, expiry_date),
    owner_id = COALESCE($13, owner_id),
    version = version + 1
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdatePolicyStatus :one
UPDATE policies SET status = $3
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- ──────────────────────────────────────────────
-- Policy Versions
-- ──────────────────────────────────────────────

-- name: CreatePolicyVersion :one
INSERT INTO policy_versions (policy_id, version, title, content, changes_summary, created_by)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListPolicyVersions :many
SELECT * FROM policy_versions
WHERE policy_id = $1
ORDER BY version DESC;

-- name: GetPolicyVersionByNumber :one
SELECT * FROM policy_versions
WHERE policy_id = $1 AND version = $2;

-- ──────────────────────────────────────────────
-- Policy Attestations
-- ──────────────────────────────────────────────

-- name: CreatePolicyAttestation :one
INSERT INTO policy_attestations (policy_id, policy_version, user_id, tenant_id, status, campaign_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetPolicyAttestationByID :one
SELECT * FROM policy_attestations WHERE id = $1;

-- name: UpdatePolicyAttestationStatus :one
UPDATE policy_attestations
SET status = $2,
    attested_at = CASE WHEN $2 = 'attested' THEN NOW() ELSE attested_at END
WHERE id = $1
RETURNING *;

-- name: ListPolicyAttestationsByCampaign :many
SELECT * FROM policy_attestations
WHERE campaign_id = $1
ORDER BY status, user_id;

-- name: CountAttestationsByCampaignAndStatus :one
SELECT COUNT(*) FROM policy_attestations
WHERE campaign_id = $1 AND status = $2;

-- ──────────────────────────────────────────────
-- Attestation Campaigns
-- ──────────────────────────────────────────────

-- name: CreateAttestationCampaign :one
INSERT INTO attestation_campaigns (tenant_id, policy_id, policy_version, target_scope, target_user_ids, due_date, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetAttestationCampaignByID :one
SELECT * FROM attestation_campaigns WHERE id = $1 AND tenant_id = $2;

-- name: ListAttestationCampaignsByPolicy :many
SELECT * FROM attestation_campaigns
WHERE policy_id = $1 AND tenant_id = $2
ORDER BY created_at DESC;

-- name: UpdateAttestationCampaignCompletionRate :exec
UPDATE attestation_campaigns SET completion_rate = $2
WHERE id = $1;

-- name: UpdateAttestationCampaignStatus :exec
UPDATE attestation_campaigns SET status = $2
WHERE id = $1;

-- ──────────────────────────────────────────────
-- RACI Matrices
-- ──────────────────────────────────────────────

-- name: CreateRACIMatrix :one
INSERT INTO raci_matrices (tenant_id, title, entity_type, entity_id, description, created_by)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetRACIMatrixByID :one
SELECT * FROM raci_matrices WHERE id = $1 AND tenant_id = $2;

-- name: ListRACIMatricesByTenant :many
SELECT * FROM raci_matrices
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateRACIMatrix :one
UPDATE raci_matrices
SET title = COALESCE($3, title),
    entity_type = COALESCE($4, entity_type),
    entity_id = COALESCE($5, entity_id),
    description = COALESCE($6, description),
    status = COALESCE($7, status)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteRACIMatrix :exec
DELETE FROM raci_matrices WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- RACI Entries
-- ──────────────────────────────────────────────

-- name: CreateRACIEntry :one
INSERT INTO raci_entries (matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListRACIEntriesByMatrix :many
SELECT * FROM raci_entries
WHERE matrix_id = $1
ORDER BY activity;

-- name: UpdateRACIEntry :one
UPDATE raci_entries
SET activity = COALESCE($2, activity),
    responsible_ids = COALESCE($3, responsible_ids),
    accountable_id = COALESCE($4, accountable_id),
    consulted_ids = COALESCE($5, consulted_ids),
    informed_ids = COALESCE($6, informed_ids),
    notes = COALESCE($7, notes)
WHERE id = $1
RETURNING *;

-- name: DeleteRACIEntry :exec
DELETE FROM raci_entries WHERE id = $1;

-- name: DeleteRACIEntriesByMatrix :exec
DELETE FROM raci_entries WHERE matrix_id = $1;

-- ──────────────────────────────────────────────
-- Meetings
-- ──────────────────────────────────────────────

-- name: CreateMeeting :one
INSERT INTO meetings (tenant_id, title, meeting_type, agenda, location, scheduled_at, duration_minutes, recurrence_rule, template_agenda, attendee_ids, organizer_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetMeetingByID :one
SELECT * FROM meetings WHERE id = $1 AND tenant_id = $2;

-- name: ListMeetingsByTenant :many
SELECT * FROM meetings
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR meeting_type = $3)
  AND ($4::timestamptz IS NULL OR scheduled_at >= $4)
  AND ($5::timestamptz IS NULL OR scheduled_at <= $5)
ORDER BY scheduled_at DESC
LIMIT $6 OFFSET $7;

-- name: UpdateMeeting :one
UPDATE meetings
SET title = COALESCE($3, title),
    meeting_type = COALESCE($4, meeting_type),
    agenda = COALESCE($5, agenda),
    minutes = COALESCE($6, minutes),
    location = COALESCE($7, location),
    scheduled_at = COALESCE($8, scheduled_at),
    duration_minutes = COALESCE($9, duration_minutes),
    recurrence_rule = COALESCE($10, recurrence_rule),
    template_agenda = COALESCE($11, template_agenda),
    attendee_ids = COALESCE($12, attendee_ids)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateMeetingStatus :one
UPDATE meetings SET status = $3
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- ──────────────────────────────────────────────
-- Meeting Decisions
-- ──────────────────────────────────────────────

-- name: CreateMeetingDecision :one
INSERT INTO meeting_decisions (meeting_id, tenant_id, decision_number, title, description, rationale, impact_assessment, decided_by_ids, evidence_refs)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetMeetingDecisionByID :one
SELECT * FROM meeting_decisions WHERE id = $1 AND tenant_id = $2;

-- name: ListMeetingDecisionsByMeeting :many
SELECT * FROM meeting_decisions
WHERE meeting_id = $1
ORDER BY created_at DESC;

-- name: UpdateMeetingDecisionStatus :exec
UPDATE meeting_decisions SET status = $2
WHERE id = $1;

-- ──────────────────────────────────────────────
-- Action Items
-- ──────────────────────────────────────────────

-- name: CreateActionItem :one
INSERT INTO action_items (tenant_id, source_type, source_id, title, description, owner_id, due_date, priority)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetActionItemByID :one
SELECT * FROM action_items WHERE id = $1 AND tenant_id = $2;

-- name: ListActionItemsByTenant :many
SELECT * FROM action_items
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::uuid IS NULL OR owner_id = $3)
  AND ($4::text IS NULL OR source_type = $4)
  AND ($5::uuid IS NULL OR source_id = $5)
ORDER BY due_date ASC
LIMIT $6 OFFSET $7;

-- name: UpdateActionItem :one
UPDATE action_items
SET title = COALESCE($3, title),
    description = COALESCE($4, description),
    owner_id = COALESCE($5, owner_id),
    due_date = COALESCE($6, due_date),
    status = COALESCE($7, status),
    completion_evidence = COALESCE($8, completion_evidence),
    priority = COALESCE($9, priority),
    completed_at = CASE WHEN $7 = 'completed' THEN NOW() ELSE completed_at END
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateActionItemStatus :one
UPDATE action_items
SET status = $3,
    completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE completed_at END
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: ListOverdueActionItems :many
SELECT * FROM action_items
WHERE tenant_id = $1
  AND status IN ('open', 'in_progress')
  AND due_date < CURRENT_DATE
ORDER BY due_date ASC
LIMIT $2 OFFSET $3;

-- ──────────────────────────────────────────────
-- OKRs
-- ──────────────────────────────────────────────

-- name: CreateOKR :one
INSERT INTO okrs (tenant_id, parent_id, level, scope_id, objective, period, owner_id, scoring_method)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetOKRByID :one
SELECT * FROM okrs WHERE id = $1 AND tenant_id = $2;

-- name: ListOKRsByTenant :many
SELECT * FROM okrs
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR period = $3)
  AND ($4::text IS NULL OR level = $4)
  AND parent_id IS NULL
ORDER BY created_at DESC
LIMIT $5 OFFSET $6;

-- name: UpdateOKR :one
UPDATE okrs
SET objective = COALESCE($3, objective),
    status = COALESCE($4, status),
    progress_pct = COALESCE($5, progress_pct),
    scoring_method = COALESCE($6, scoring_method)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: UpdateOKRProgress :exec
UPDATE okrs SET progress_pct = $2
WHERE id = $1;

-- name: ListOKRChildren :many
SELECT * FROM okrs
WHERE parent_id = $1
ORDER BY created_at ASC;

-- ──────────────────────────────────────────────
-- Key Results
-- ──────────────────────────────────────────────

-- name: CreateKeyResult :one
INSERT INTO key_results (okr_id, title, target_value, unit)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListKeyResultsByOKR :many
SELECT * FROM key_results
WHERE okr_id = $1
ORDER BY title;

-- name: UpdateKeyResult :one
UPDATE key_results
SET title = COALESCE($2, title),
    target_value = COALESCE($3, target_value),
    current_value = COALESCE($4, current_value),
    unit = COALESCE($5, unit),
    status = COALESCE($6, status)
WHERE id = $1
RETURNING *;

-- name: DeleteKeyResult :exec
DELETE FROM key_results WHERE id = $1;

-- ──────────────────────────────────────────────
-- KPIs
-- ──────────────────────────────────────────────

-- name: CreateKPI :one
INSERT INTO kpis (tenant_id, name, description, formula, target_value, warning_threshold, critical_threshold, unit, frequency, owner_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetKPIByID :one
SELECT * FROM kpis WHERE id = $1 AND tenant_id = $2;

-- name: ListKPIsByTenant :many
SELECT * FROM kpis
WHERE tenant_id = $1
ORDER BY name
LIMIT $2 OFFSET $3;

-- name: UpdateKPI :one
UPDATE kpis
SET name = COALESCE($3, name),
    description = COALESCE($4, description),
    formula = COALESCE($5, formula),
    target_value = COALESCE($6, target_value),
    warning_threshold = COALESCE($7, warning_threshold),
    critical_threshold = COALESCE($8, critical_threshold),
    current_value = COALESCE($9, current_value),
    unit = COALESCE($10, unit),
    frequency = COALESCE($11, frequency),
    owner_id = COALESCE($12, owner_id),
    last_updated_at = NOW()
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteKPI :exec
DELETE FROM kpis WHERE id = $1 AND tenant_id = $2;

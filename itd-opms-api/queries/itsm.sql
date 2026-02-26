-- ──────────────────────────────────────────────
-- Service Catalog Categories
-- ──────────────────────────────────────────────

-- name: CreateCatalogCategory :one
INSERT INTO service_catalog_categories (tenant_id, name, description, icon, parent_id, sort_order)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetCatalogCategory :one
SELECT * FROM service_catalog_categories WHERE id = $1 AND tenant_id = $2;

-- name: ListCatalogCategories :many
SELECT * FROM service_catalog_categories
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR parent_id = $2)
ORDER BY sort_order ASC, name ASC;

-- name: UpdateCatalogCategory :one
UPDATE service_catalog_categories
SET name = COALESCE($3, name),
    description = COALESCE($4, description),
    icon = COALESCE($5, icon),
    parent_id = COALESCE($6, parent_id),
    sort_order = COALESCE($7, sort_order)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCatalogCategory :exec
DELETE FROM service_catalog_categories WHERE id = $1 AND tenant_id = $2;

-- name: CountCatalogCategories :one
SELECT COUNT(*)::int AS count FROM service_catalog_categories WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- Service Catalog Items
-- ──────────────────────────────────────────────

-- name: CreateCatalogItem :one
INSERT INTO service_catalog_items (
    tenant_id, category_id, name, description, fulfillment_workflow_id,
    approval_required, approval_chain_config, sla_policy_id, form_schema,
    entitlement_roles, estimated_delivery, status, version
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetCatalogItem :one
SELECT * FROM service_catalog_items WHERE id = $1 AND tenant_id = $2;

-- name: ListCatalogItems :many
SELECT * FROM service_catalog_items
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR category_id = $2)
  AND ($3::text IS NULL OR status = $3)
ORDER BY name ASC
LIMIT $4 OFFSET $5;

-- name: CountCatalogItems :one
SELECT COUNT(*)::int AS count FROM service_catalog_items
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR category_id = $2)
  AND ($3::text IS NULL OR status = $3);

-- name: UpdateCatalogItem :one
UPDATE service_catalog_items
SET category_id = COALESCE($3, category_id),
    name = COALESCE($4, name),
    description = COALESCE($5, description),
    fulfillment_workflow_id = COALESCE($6, fulfillment_workflow_id),
    approval_required = COALESCE($7, approval_required),
    approval_chain_config = COALESCE($8, approval_chain_config),
    sla_policy_id = COALESCE($9, sla_policy_id),
    form_schema = COALESCE($10, form_schema),
    entitlement_roles = COALESCE($11, entitlement_roles),
    estimated_delivery = COALESCE($12, estimated_delivery),
    status = COALESCE($13, status),
    version = COALESCE($14, version)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteCatalogItem :exec
DELETE FROM service_catalog_items WHERE id = $1 AND tenant_id = $2;

-- name: ListCatalogItemsByEntitlement :many
SELECT * FROM service_catalog_items
WHERE tenant_id = $1
  AND status = 'active'
  AND (entitlement_roles = '{}' OR entitlement_roles && $2::text[])
ORDER BY name ASC;

-- ──────────────────────────────────────────────
-- Tickets
-- ──────────────────────────────────────────────

-- name: CreateTicket :one
INSERT INTO tickets (
    tenant_id, ticket_number, type, category, subcategory, title, description,
    priority, urgency, impact, status, channel, reporter_id, assignee_id,
    team_queue_id, sla_policy_id, sla_response_target, sla_resolution_target,
    sla_response_met, sla_resolution_met, sla_paused_at, sla_paused_duration_minutes,
    is_major_incident, related_ticket_ids, linked_problem_id, linked_asset_ids,
    resolution_notes, resolved_at, closed_at, first_response_at,
    satisfaction_score, tags, custom_fields
)
VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
    $27, $28, $29, $30, $31, $32, $33
)
RETURNING *;

-- name: GetTicket :one
SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2;

-- name: ListTickets :many
SELECT * FROM tickets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR priority = $3)
  AND ($4::text IS NULL OR type = $4)
  AND ($5::uuid IS NULL OR assignee_id = $5)
  AND ($6::uuid IS NULL OR reporter_id = $6)
  AND ($7::uuid IS NULL OR team_queue_id = $7)
ORDER BY created_at DESC
LIMIT $8 OFFSET $9;

-- name: CountTickets :one
SELECT COUNT(*)::int AS count FROM tickets
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR priority = $3)
  AND ($4::text IS NULL OR type = $4)
  AND ($5::uuid IS NULL OR assignee_id = $5)
  AND ($6::uuid IS NULL OR reporter_id = $6)
  AND ($7::uuid IS NULL OR team_queue_id = $7);

-- name: UpdateTicket :one
UPDATE tickets
SET category = COALESCE($3, category),
    subcategory = COALESCE($4, subcategory),
    title = COALESCE($5, title),
    description = COALESCE($6, description),
    tags = COALESCE($7, tags),
    custom_fields = COALESCE($8, custom_fields)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: TransitionTicketStatus :one
UPDATE tickets
SET status = $3
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: AssignTicket :one
UPDATE tickets
SET assignee_id = $3,
    team_queue_id = $4
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: SetSLATargets :exec
UPDATE tickets
SET sla_policy_id = $3,
    sla_response_target = $4,
    sla_resolution_target = $5
WHERE id = $1 AND tenant_id = $2;

-- name: RecordFirstResponse :exec
UPDATE tickets
SET first_response_at = $3,
    sla_response_met = $4
WHERE id = $1 AND tenant_id = $2
  AND first_response_at IS NULL;

-- name: ResolveTicket :one
UPDATE tickets
SET status = 'resolved',
    resolution_notes = $3,
    resolved_at = now(),
    sla_resolution_met = $4
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: CloseTicket :exec
UPDATE tickets
SET status = 'closed',
    closed_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: DeclareMajorIncident :exec
UPDATE tickets
SET is_major_incident = true
WHERE id = $1 AND tenant_id = $2;

-- name: LinkTickets :exec
UPDATE tickets
SET related_ticket_ids = array_append(related_ticket_ids, $3)
WHERE id = $1 AND tenant_id = $2;

-- name: PauseSLA :exec
UPDATE tickets
SET sla_paused_at = now()
WHERE id = $1 AND tenant_id = $2;

-- name: ResumeSLA :exec
UPDATE tickets
SET sla_paused_at = NULL,
    sla_paused_duration_minutes = sla_paused_duration_minutes + $3
WHERE id = $1 AND tenant_id = $2;

-- name: ListMyQueue :many
SELECT * FROM tickets
WHERE tenant_id = $1
  AND assignee_id = $2
  AND status NOT IN ('closed','cancelled')
ORDER BY
    CASE priority
        WHEN 'P1_critical' THEN 1
        WHEN 'P2_high' THEN 2
        WHEN 'P3_medium' THEN 3
        ELSE 4
    END,
    created_at ASC
LIMIT $3 OFFSET $4;

-- name: CountMyQueue :one
SELECT COUNT(*)::int AS count FROM tickets
WHERE tenant_id = $1
  AND assignee_id = $2
  AND status NOT IN ('closed','cancelled');

-- name: ListTeamQueue :many
SELECT * FROM tickets
WHERE tenant_id = $1
  AND team_queue_id = $2
  AND status NOT IN ('closed','cancelled')
ORDER BY
    CASE priority
        WHEN 'P1_critical' THEN 1
        WHEN 'P2_high' THEN 2
        WHEN 'P3_medium' THEN 3
        ELSE 4
    END,
    created_at ASC
LIMIT $3 OFFSET $4;

-- name: CountTeamQueue :one
SELECT COUNT(*)::int AS count FROM tickets
WHERE tenant_id = $1
  AND team_queue_id = $2
  AND status NOT IN ('closed','cancelled');

-- name: GetTicketStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status NOT IN ('closed','cancelled','resolved'))::int AS open_count,
    COUNT(*) FILTER (WHERE sla_resolution_met = false)::int AS sla_breached_count,
    COUNT(*) FILTER (WHERE is_major_incident = true AND status NOT IN ('closed','cancelled','resolved'))::int AS major_incidents
FROM tickets
WHERE tenant_id = $1;

-- ──────────────────────────────────────────────
-- Ticket Comments
-- ──────────────────────────────────────────────

-- name: CreateTicketComment :one
INSERT INTO ticket_comments (ticket_id, author_id, content, is_internal, attachments)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListTicketComments :many
SELECT * FROM ticket_comments
WHERE ticket_id = $1
  AND ($2::boolean IS NULL OR is_internal = $2)
ORDER BY created_at ASC;

-- name: CountTicketComments :one
SELECT COUNT(*)::int AS count FROM ticket_comments WHERE ticket_id = $1;

-- ──────────────────────────────────────────────
-- Ticket Status History
-- ──────────────────────────────────────────────

-- name: CreateStatusHistory :exec
INSERT INTO ticket_status_history (ticket_id, from_status, to_status, changed_by, reason)
VALUES ($1, $2, $3, $4, $5);

-- name: ListStatusHistory :many
SELECT * FROM ticket_status_history
WHERE ticket_id = $1
ORDER BY created_at ASC;

-- ──────────────────────────────────────────────
-- Escalation Rules
-- ──────────────────────────────────────────────

-- name: CreateEscalationRule :one
INSERT INTO escalation_rules (tenant_id, name, trigger_type, trigger_config, escalation_chain, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetEscalationRule :one
SELECT * FROM escalation_rules WHERE id = $1 AND tenant_id = $2;

-- name: ListEscalationRules :many
SELECT * FROM escalation_rules
WHERE tenant_id = $1
  AND ($2::boolean IS NULL OR is_active = $2)
ORDER BY name ASC;

-- name: UpdateEscalationRule :one
UPDATE escalation_rules
SET name = COALESCE($3, name),
    trigger_type = COALESCE($4, trigger_type),
    trigger_config = COALESCE($5, trigger_config),
    escalation_chain = COALESCE($6, escalation_chain),
    is_active = COALESCE($7, is_active)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteEscalationRule :exec
DELETE FROM escalation_rules WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- SLA Policies
-- ──────────────────────────────────────────────

-- name: CreateSLAPolicy :one
INSERT INTO sla_policies (tenant_id, name, description, priority_targets, business_hours_calendar_id, is_default, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetSLAPolicy :one
SELECT * FROM sla_policies WHERE id = $1 AND tenant_id = $2;

-- name: ListSLAPolicies :many
SELECT * FROM sla_policies
WHERE tenant_id = $1
  AND ($2::boolean IS NULL OR is_active = $2)
ORDER BY name ASC
LIMIT $3 OFFSET $4;

-- name: CountSLAPolicies :one
SELECT COUNT(*)::int AS count FROM sla_policies
WHERE tenant_id = $1
  AND ($2::boolean IS NULL OR is_active = $2);

-- name: UpdateSLAPolicy :one
UPDATE sla_policies
SET name = COALESCE($3, name),
    description = COALESCE($4, description),
    priority_targets = COALESCE($5, priority_targets),
    business_hours_calendar_id = COALESCE($6, business_hours_calendar_id),
    is_default = COALESCE($7, is_default),
    is_active = COALESCE($8, is_active)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteSLAPolicy :exec
DELETE FROM sla_policies WHERE id = $1 AND tenant_id = $2;

-- name: GetDefaultSLAPolicy :one
SELECT * FROM sla_policies
WHERE tenant_id = $1
  AND is_default = true
  AND is_active = true;

-- ──────────────────────────────────────────────
-- Business Hours Calendars
-- ──────────────────────────────────────────────

-- name: CreateBusinessHoursCalendar :one
INSERT INTO business_hours_calendars (tenant_id, name, timezone, schedule, holidays)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetBusinessHoursCalendar :one
SELECT * FROM business_hours_calendars WHERE id = $1 AND tenant_id = $2;

-- name: ListBusinessHoursCalendars :many
SELECT * FROM business_hours_calendars
WHERE tenant_id = $1
ORDER BY name ASC;

-- name: UpdateBusinessHoursCalendar :one
UPDATE business_hours_calendars
SET name = COALESCE($3, name),
    timezone = COALESCE($4, timezone),
    schedule = COALESCE($5, schedule),
    holidays = COALESCE($6, holidays)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteBusinessHoursCalendar :exec
DELETE FROM business_hours_calendars WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- SLA Breach Log
-- ──────────────────────────────────────────────

-- name: CreateSLABreach :exec
INSERT INTO sla_breach_log (ticket_id, breach_type, breached_at, target_was, actual_duration_minutes)
VALUES ($1, $2, $3, $4, $5);

-- name: ListSLABreaches :many
SELECT * FROM sla_breach_log
WHERE ticket_id = $1
ORDER BY breached_at DESC;

-- name: GetSLAComplianceStats :one
SELECT
    COUNT(*)::int AS total_tickets,
    COUNT(*) FILTER (WHERE sla_response_met = true)::int AS response_met,
    COUNT(*) FILTER (WHERE sla_resolution_met = true)::int AS resolution_met
FROM tickets
WHERE tenant_id = $1
  AND sla_policy_id IS NOT NULL
  AND status IN ('resolved','closed')
  AND ($2::text IS NULL OR priority = $2);

-- ──────────────────────────────────────────────
-- Problems
-- ──────────────────────────────────────────────

-- name: CreateProblem :one
INSERT INTO problems (tenant_id, problem_number, title, description, root_cause, status, linked_incident_ids, workaround, permanent_fix, linked_change_id, owner_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetProblem :one
SELECT * FROM problems WHERE id = $1 AND tenant_id = $2;

-- name: ListProblems :many
SELECT * FROM problems
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountProblems :one
SELECT COUNT(*)::int AS count FROM problems
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2);

-- name: UpdateProblem :one
UPDATE problems
SET title = COALESCE($3, title),
    description = COALESCE($4, description),
    root_cause = COALESCE($5, root_cause),
    status = COALESCE($6, status),
    workaround = COALESCE($7, workaround),
    permanent_fix = COALESCE($8, permanent_fix),
    linked_change_id = COALESCE($9, linked_change_id),
    owner_id = COALESCE($10, owner_id)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteProblem :exec
DELETE FROM problems WHERE id = $1 AND tenant_id = $2;

-- name: LinkIncidentToProblem :exec
UPDATE problems
SET linked_incident_ids = array_append(linked_incident_ids, $3)
WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- Known Errors
-- ──────────────────────────────────────────────

-- name: CreateKnownError :one
INSERT INTO known_errors (problem_id, title, description, workaround, kb_article_id, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetKnownError :one
SELECT * FROM known_errors WHERE id = $1;

-- name: ListKnownErrors :many
SELECT * FROM known_errors
WHERE problem_id = $1
ORDER BY created_at DESC;

-- name: UpdateKnownError :one
UPDATE known_errors
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    workaround = COALESCE($4, workaround),
    kb_article_id = COALESCE($5, kb_article_id),
    status = COALESCE($6, status)
WHERE id = $1
RETURNING *;

-- name: DeleteKnownError :exec
DELETE FROM known_errors WHERE id = $1;

-- ──────────────────────────────────────────────
-- Support Queues
-- ──────────────────────────────────────────────

-- name: CreateSupportQueue :one
INSERT INTO support_queues (tenant_id, name, team_id, priority_filter, auto_assign_rule, is_active)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetSupportQueue :one
SELECT * FROM support_queues WHERE id = $1 AND tenant_id = $2;

-- name: ListSupportQueues :many
SELECT * FROM support_queues
WHERE tenant_id = $1
  AND ($2::boolean IS NULL OR is_active = $2)
ORDER BY name ASC;

-- name: UpdateSupportQueue :one
UPDATE support_queues
SET name = COALESCE($3, name),
    team_id = COALESCE($4, team_id),
    priority_filter = COALESCE($5, priority_filter),
    auto_assign_rule = COALESCE($6, auto_assign_rule),
    is_active = COALESCE($7, is_active)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteSupportQueue :exec
DELETE FROM support_queues WHERE id = $1 AND tenant_id = $2;

-- ──────────────────────────────────────────────
-- CSAT Surveys
-- ──────────────────────────────────────────────

-- name: CreateCSATSurvey :one
INSERT INTO csat_surveys (ticket_id, respondent_id, rating, comment)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetCSATForTicket :one
SELECT * FROM csat_surveys WHERE ticket_id = $1;

-- name: GetCSATStats :one
SELECT
    COUNT(*)::int AS total,
    COALESCE(AVG(rating), 0)::numeric(3,2) AS avg_rating
FROM csat_surveys cs
JOIN tickets t ON cs.ticket_id = t.id
WHERE t.tenant_id = $1;

-- name: ListCSATSurveys :many
SELECT cs.* FROM csat_surveys cs
JOIN tickets t ON cs.ticket_id = t.id
WHERE t.tenant_id = $1
ORDER BY cs.created_at DESC
LIMIT $2 OFFSET $3;

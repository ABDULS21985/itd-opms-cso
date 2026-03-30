-- name: CreateMajorIncidentRecord :one
INSERT INTO major_incident_records (
    tenant_id,
    ticket_id,
    severity,
    incident_commander_id,
    communication_lead_id,
    bridge_url,
    bridge_phone,
    affected_services,
    affected_ci_ids,
    estimated_affected_users,
    business_impact,
    status,
    stakeholder_updates,
    communication_plan,
    declared_at,
    created_at,
    updated_at
)
VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
)
RETURNING *;

-- name: GetMajorIncidentByTicketID :one
SELECT * FROM major_incident_records
WHERE tenant_id = $1 AND ticket_id = $2;

-- name: GetMajorIncidentByID :one
SELECT * FROM major_incident_records
WHERE tenant_id = $1 AND id = $2;

-- name: ListActiveMajorIncidents :many
SELECT * FROM major_incident_records
WHERE tenant_id = $1
  AND status NOT IN ('closed')
ORDER BY declared_at DESC;

-- name: ListMajorIncidents :many
SELECT * FROM major_incident_records
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR severity = $3)
  AND ($4::timestamptz IS NULL OR declared_at >= $4)
  AND ($5::timestamptz IS NULL OR declared_at <= $5)
  AND ($6::uuid IS NULL OR ticket_id = $6)
ORDER BY declared_at DESC
LIMIT $7 OFFSET $8;

-- name: CountMajorIncidents :one
SELECT COUNT(*)::bigint AS count
FROM major_incident_records
WHERE tenant_id = $1
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR severity = $3)
  AND ($4::timestamptz IS NULL OR declared_at >= $4)
  AND ($5::timestamptz IS NULL OR declared_at <= $5)
  AND ($6::uuid IS NULL OR ticket_id = $6);

-- name: TransitionMajorIncidentStatus :one
UPDATE major_incident_records
SET status = $3,
    resolved_at = COALESCE($4, resolved_at),
    closed_at = COALESCE($5, closed_at),
    pir_scheduled_date = COALESCE($6, pir_scheduled_date),
    total_duration_minutes = COALESCE($7, total_duration_minutes),
    updated_at = $8
WHERE tenant_id = $1 AND id = $2
RETURNING *;

-- name: AddStakeholderUpdate :one
UPDATE major_incident_records
SET stakeholder_updates = COALESCE(stakeholder_updates, '[]'::jsonb) || jsonb_build_array($3::jsonb),
    updated_at = $4
WHERE tenant_id = $1 AND id = $2
RETURNING *;

-- name: SetResolution :one
UPDATE major_incident_records
SET resolution_summary = $3,
    root_cause_summary = $4,
    resolved_at = $5,
    total_duration_minutes = $6,
    updated_at = $7
WHERE tenant_id = $1 AND id = $2
RETURNING *;

-- name: SubmitPIR :one
UPDATE major_incident_records
SET pir_report = $3,
    pir_completed_date = $4,
    updated_at = $5
WHERE tenant_id = $1 AND id = $2
RETURNING *;

-- name: UpdateMajorIncidentCommunicationPlan :one
UPDATE major_incident_records
SET communication_plan = $3,
    updated_at = $4
WHERE tenant_id = $1 AND id = $2
RETURNING *;

-- name: GetMajorIncidentStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status <> 'closed')::int AS active,
    COALESCE(AVG(total_duration_minutes), 0)::float8 AS avg_duration_minutes,
    jsonb_build_object(
        'declared', COUNT(*) FILTER (WHERE status = 'declared'),
        'investigating', COUNT(*) FILTER (WHERE status = 'investigating'),
        'mitigating', COUNT(*) FILTER (WHERE status = 'mitigating'),
        'mitigated', COUNT(*) FILTER (WHERE status = 'mitigated'),
        'monitoring', COUNT(*) FILTER (WHERE status = 'monitoring'),
        'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
        'pir_pending', COUNT(*) FILTER (WHERE status = 'pir_pending'),
        'closed', COUNT(*) FILTER (WHERE status = 'closed')
    ) AS status_counts,
    jsonb_build_object(
        'sev1', COUNT(*) FILTER (WHERE severity = 'sev1'),
        'sev2', COUNT(*) FILTER (WHERE severity = 'sev2'),
        'sev3', COUNT(*) FILTER (WHERE severity = 'sev3')
    ) AS severity_counts
FROM major_incident_records
WHERE tenant_id = $1;

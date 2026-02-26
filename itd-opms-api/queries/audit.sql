-- name: CreateAuditEvent :one
INSERT INTO audit_events (tenant_id, actor_id, actor_role, action, entity_type, entity_id, changes, previous_state, evidence_refs, ip_address, user_agent, correlation_id, checksum)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
RETURNING *;

-- name: GetAuditEvent :one
SELECT * FROM audit_events WHERE event_id = $1;

-- name: ListAuditEvents :many
SELECT * FROM audit_events
WHERE tenant_id = $1
  AND ($2::text IS NULL OR action = $2)
  AND ($3::text IS NULL OR entity_type = $3)
  AND ($4::uuid IS NULL OR entity_id = $4)
  AND ($5::uuid IS NULL OR actor_id = $5)
  AND ($6::timestamptz IS NULL OR timestamp >= $6)
  AND ($7::timestamptz IS NULL OR timestamp <= $7)
ORDER BY timestamp DESC
LIMIT $8 OFFSET $9;

-- name: CountAuditEvents :one
SELECT COUNT(*) FROM audit_events
WHERE tenant_id = $1
  AND ($2::text IS NULL OR action = $2)
  AND ($3::text IS NULL OR entity_type = $3)
  AND ($4::uuid IS NULL OR entity_id = $4)
  AND ($5::uuid IS NULL OR actor_id = $5)
  AND ($6::timestamptz IS NULL OR timestamp >= $6)
  AND ($7::timestamptz IS NULL OR timestamp <= $7);

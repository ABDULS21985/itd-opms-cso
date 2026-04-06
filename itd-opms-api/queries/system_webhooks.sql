-- ──────────────────────────────────────────────
-- System Module: Webhook Endpoint & Log Queries
-- ──────────────────────────────────────────────

-- name: CreateWebhookEndpoint :one
INSERT INTO webhook_endpoints (
    tenant_id, name, slug, description, secret,
    target_action, payload_transform, created_by
) VALUES (
    @tenant_id, @name, @slug, @description, @secret,
    @target_action, @payload_transform, @created_by
)
RETURNING *;

-- name: GetWebhookEndpointByID :one
SELECT * FROM webhook_endpoints
WHERE id = @id AND tenant_id = @tenant_id;

-- name: GetWebhookEndpointBySlug :one
SELECT * FROM webhook_endpoints
WHERE slug = @slug;

-- name: ListWebhookEndpoints :many
SELECT * FROM webhook_endpoints
WHERE tenant_id = @tenant_id
ORDER BY created_at DESC
LIMIT @page_limit OFFSET @page_offset;

-- name: CountWebhookEndpoints :one
SELECT COUNT(*) FROM webhook_endpoints
WHERE tenant_id = @tenant_id;

-- name: UpdateWebhookEndpoint :one
UPDATE webhook_endpoints
SET name = COALESCE(NULLIF(CAST(@name AS TEXT), ''), name),
    description = CASE WHEN CAST(@update_description AS BOOLEAN) THEN @description ELSE description END,
    is_active = CASE WHEN CAST(@update_is_active AS BOOLEAN) THEN CAST(@is_active AS BOOLEAN) ELSE is_active END,
    target_action = COALESCE(NULLIF(CAST(@target_action AS TEXT), ''), target_action),
    payload_transform = CASE WHEN CAST(@update_payload AS BOOLEAN) THEN @payload_transform ELSE payload_transform END,
    updated_at = now()
WHERE id = @id AND tenant_id = @tenant_id
RETURNING *;

-- name: DeleteWebhookEndpoint :exec
DELETE FROM webhook_endpoints
WHERE id = @id AND tenant_id = @tenant_id;

-- name: UpdateWebhookEndpointSecret :one
UPDATE webhook_endpoints
SET secret = @secret, updated_at = now()
WHERE id = @id AND tenant_id = @tenant_id
RETURNING *;

-- name: UpdateWebhookEndpointStats :exec
UPDATE webhook_endpoints
SET last_received_at = now(),
    total_received = total_received + 1,
    total_errors = total_errors + CAST(@error_increment AS INT)
WHERE id = @id;

-- name: CreateWebhookLog :one
INSERT INTO webhook_logs (
    endpoint_id, source_ip, headers, payload,
    signature_valid, action_taken, action_result, error
) VALUES (
    @endpoint_id, @source_ip, @headers, @payload,
    @signature_valid, @action_taken, @action_result, @error
)
RETURNING *;

-- name: ListWebhookLogs :many
SELECT * FROM webhook_logs
WHERE endpoint_id = @endpoint_id
ORDER BY received_at DESC
LIMIT @page_limit OFFSET @page_offset;

-- name: CountWebhookLogs :one
SELECT COUNT(*) FROM webhook_logs
WHERE endpoint_id = @endpoint_id;

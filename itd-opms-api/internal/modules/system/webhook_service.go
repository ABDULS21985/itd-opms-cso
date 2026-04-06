package system

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

var slugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

// WebhookService handles admin CRUD for webhook endpoints and log queries.
type WebhookService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewWebhookService creates a new WebhookService.
func NewWebhookService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *WebhookService {
	return &WebhookService{pool: pool, auditSvc: auditSvc}
}

/* ------------------------------------------------------------------ */
/*  Scan helpers                                                       */
/* ------------------------------------------------------------------ */

func scanWebhookEndpoint(row pgx.Row) (WebhookEndpoint, error) {
	var e WebhookEndpoint
	err := row.Scan(
		&e.ID, &e.TenantID, &e.Name, &e.Slug, &e.Description, &e.Secret,
		&e.IsActive, &e.PayloadTransform, &e.TargetAction,
		&e.LastReceivedAt, &e.TotalReceived, &e.TotalErrors,
		&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	return e, err
}

func scanWebhookEndpoints(rows pgx.Rows) ([]WebhookEndpoint, error) {
	var endpoints []WebhookEndpoint
	for rows.Next() {
		var e WebhookEndpoint
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.Name, &e.Slug, &e.Description, &e.Secret,
			&e.IsActive, &e.PayloadTransform, &e.TargetAction,
			&e.LastReceivedAt, &e.TotalReceived, &e.TotalErrors,
			&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if endpoints == nil {
		endpoints = []WebhookEndpoint{}
	}
	return endpoints, nil
}

func scanWebhookLog(row pgx.Row) (WebhookLog, error) {
	var l WebhookLog
	err := row.Scan(
		&l.ID, &l.EndpointID, &l.ReceivedAt, &l.SourceIP,
		&l.Headers, &l.Payload, &l.SignatureValid,
		&l.ActionTaken, &l.ActionResult, &l.Error,
	)
	return l, err
}

func scanWebhookLogs(rows pgx.Rows) ([]WebhookLog, error) {
	var logs []WebhookLog
	for rows.Next() {
		var l WebhookLog
		if err := rows.Scan(
			&l.ID, &l.EndpointID, &l.ReceivedAt, &l.SourceIP,
			&l.Headers, &l.Payload, &l.SignatureValid,
			&l.ActionTaken, &l.ActionResult, &l.Error,
		); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if logs == nil {
		logs = []WebhookLog{}
	}
	return logs, nil
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

func generateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate secret: %w", err)
	}
	return hex.EncodeToString(b), nil
}

const webhookEndpointCols = `id, tenant_id, name, slug, description, secret,
	is_active, payload_transform, target_action,
	last_received_at, total_received, total_errors,
	created_by, created_at, updated_at`

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

// CreateEndpoint creates a new webhook endpoint with an auto-generated secret.
func (s *WebhookService) CreateEndpoint(ctx context.Context, req CreateWebhookEndpointRequest) (WebhookEndpoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return WebhookEndpoint{}, apperrors.Unauthorized("authentication required")
	}

	if req.Name == "" {
		return WebhookEndpoint{}, apperrors.BadRequest("name is required")
	}
	if req.Slug == "" {
		return WebhookEndpoint{}, apperrors.BadRequest("slug is required")
	}
	if !slugRe.MatchString(req.Slug) {
		return WebhookEndpoint{}, apperrors.BadRequest("slug must be lowercase alphanumeric with hyphens")
	}
	if !validTargetActions[req.TargetAction] {
		return WebhookEndpoint{}, apperrors.BadRequest("invalid target action")
	}

	secret, err := generateSecret()
	if err != nil {
		return WebhookEndpoint{}, err
	}

	if req.PayloadTransform == nil {
		req.PayloadTransform = json.RawMessage(`{}`)
	}

	query := fmt.Sprintf(`INSERT INTO webhook_endpoints
		(tenant_id, name, slug, description, secret, target_action, payload_transform, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING %s`, webhookEndpointCols)

	ep, err := scanWebhookEndpoint(s.pool.QueryRow(ctx, query,
		auth.TenantID, req.Name, req.Slug, req.Description,
		secret, req.TargetAction, req.PayloadTransform, auth.UserID,
	))
	if err != nil {
		return WebhookEndpoint{}, fmt.Errorf("create webhook endpoint: %w", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:webhook_endpoint",
		EntityType: "webhook_endpoint",
		EntityID:   ep.ID,
		Changes:    mustJSON(map[string]any{"name": ep.Name, "slug": ep.Slug, "targetAction": ep.TargetAction}),
	})

	return ep, nil
}

// ListEndpoints returns paginated webhook endpoints for the tenant.
// Secrets are stripped from the response.
func (s *WebhookService) ListEndpoints(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]WebhookEndpoint, int, error) {
	var total int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM webhook_endpoints WHERE tenant_id = $1`, tenantID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count webhook endpoints: %w", err)
	}

	query := fmt.Sprintf(`SELECT %s FROM webhook_endpoints
		WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, webhookEndpointCols)

	rows, err := s.pool.Query(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list webhook endpoints: %w", err)
	}
	defer rows.Close()

	endpoints, err := scanWebhookEndpoints(rows)
	if err != nil {
		return nil, 0, fmt.Errorf("scan webhook endpoints: %w", err)
	}

	// Strip secrets from list response.
	for i := range endpoints {
		endpoints[i].Secret = ""
	}

	return endpoints, total, nil
}

// GetEndpoint returns a single webhook endpoint by ID (includes secret).
func (s *WebhookService) GetEndpoint(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (WebhookEndpoint, error) {
	query := fmt.Sprintf(`SELECT %s FROM webhook_endpoints WHERE id = $1 AND tenant_id = $2`, webhookEndpointCols)

	ep, err := scanWebhookEndpoint(s.pool.QueryRow(ctx, query, id, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return WebhookEndpoint{}, apperrors.NotFound("webhook_endpoint", id.String())
		}
		return WebhookEndpoint{}, fmt.Errorf("get webhook endpoint: %w", err)
	}
	return ep, nil
}

// GetEndpointBySlug returns a webhook endpoint by slug (globally unique).
// Used by the public receiver — does not filter by tenant.
func (s *WebhookService) GetEndpointBySlug(ctx context.Context, slug string) (WebhookEndpoint, error) {
	query := fmt.Sprintf(`SELECT %s FROM webhook_endpoints WHERE slug = $1`, webhookEndpointCols)

	ep, err := scanWebhookEndpoint(s.pool.QueryRow(ctx, query, slug))
	if err != nil {
		if err == pgx.ErrNoRows {
			return WebhookEndpoint{}, apperrors.NotFound("webhook_endpoint", slug)
		}
		return WebhookEndpoint{}, fmt.Errorf("get webhook endpoint by slug: %w", err)
	}
	return ep, nil
}

// UpdateEndpoint partially updates a webhook endpoint.
func (s *WebhookService) UpdateEndpoint(ctx context.Context, tenantID uuid.UUID, id uuid.UUID, req UpdateWebhookEndpointRequest) (WebhookEndpoint, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return WebhookEndpoint{}, apperrors.Unauthorized("authentication required")
	}

	// Build dynamic SET clause.
	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.Name != nil {
		sets = append(sets, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *req.Description)
		argIdx++
	}
	if req.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", argIdx))
		args = append(args, *req.IsActive)
		argIdx++
	}
	if req.TargetAction != nil {
		if !validTargetActions[*req.TargetAction] {
			return WebhookEndpoint{}, apperrors.BadRequest("invalid target action")
		}
		sets = append(sets, fmt.Sprintf("target_action = $%d", argIdx))
		args = append(args, *req.TargetAction)
		argIdx++
	}
	if req.PayloadTransform != nil {
		sets = append(sets, fmt.Sprintf("payload_transform = $%d", argIdx))
		args = append(args, req.PayloadTransform)
		argIdx++
	}

	if len(sets) == 0 {
		return s.GetEndpoint(ctx, tenantID, id)
	}

	query := fmt.Sprintf("UPDATE webhook_endpoints SET %s WHERE id = $%d AND tenant_id = $%d RETURNING %s",
		joinStrings(sets, ", "), argIdx, argIdx+1, webhookEndpointCols)
	args = append(args, id, tenantID)

	ep, err := scanWebhookEndpoint(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		if err == pgx.ErrNoRows {
			return WebhookEndpoint{}, apperrors.NotFound("webhook_endpoint", id.String())
		}
		return WebhookEndpoint{}, fmt.Errorf("update webhook endpoint: %w", err)
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:webhook_endpoint",
		EntityType: "webhook_endpoint",
		EntityID:   ep.ID,
	})

	return ep, nil
}

// DeleteEndpoint deletes a webhook endpoint and its logs (CASCADE).
func (s *WebhookService) DeleteEndpoint(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tag, err := s.pool.Exec(ctx,
		`DELETE FROM webhook_endpoints WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete webhook endpoint: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("webhook_endpoint", id.String())
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:webhook_endpoint",
		EntityType: "webhook_endpoint",
		EntityID:   id,
	})

	return nil
}

// RegenerateSecret generates a new HMAC secret for the endpoint.
func (s *WebhookService) RegenerateSecret(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (string, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return "", apperrors.Unauthorized("authentication required")
	}

	secret, err := generateSecret()
	if err != nil {
		return "", err
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE webhook_endpoints SET secret = $1 WHERE id = $2 AND tenant_id = $3`,
		secret, id, tenantID)
	if err != nil {
		return "", fmt.Errorf("regenerate webhook secret: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return "", apperrors.NotFound("webhook_endpoint", id.String())
	}

	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "regenerate_secret:webhook_endpoint",
		EntityType: "webhook_endpoint",
		EntityID:   id,
	})

	return secret, nil
}

/* ------------------------------------------------------------------ */
/*  Logs                                                               */
/* ------------------------------------------------------------------ */

// ListLogs returns paginated logs for a webhook endpoint.
func (s *WebhookService) ListLogs(ctx context.Context, endpointID uuid.UUID, limit, offset int) ([]WebhookLog, int, error) {
	var total int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM webhook_logs WHERE endpoint_id = $1`, endpointID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count webhook logs: %w", err)
	}

	rows, err := s.pool.Query(ctx,
		`SELECT id, endpoint_id, received_at, source_ip, headers, payload,
		        signature_valid, action_taken, action_result, error
		 FROM webhook_logs
		 WHERE endpoint_id = $1
		 ORDER BY received_at DESC
		 LIMIT $2 OFFSET $3`,
		endpointID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list webhook logs: %w", err)
	}
	defer rows.Close()

	logs, err := scanWebhookLogs(rows)
	if err != nil {
		return nil, 0, fmt.Errorf("scan webhook logs: %w", err)
	}

	return logs, total, nil
}

/* ------------------------------------------------------------------ */
/*  Stats update (called by receiver)                                  */
/* ------------------------------------------------------------------ */

// IncrementStats bumps counters and last_received_at after a webhook is received.
func (s *WebhookService) IncrementStats(ctx context.Context, id uuid.UUID, hadError bool) {
	errInc := 0
	if hadError {
		errInc = 1
	}
	_, _ = s.pool.Exec(ctx,
		`UPDATE webhook_endpoints
		 SET last_received_at = now(),
		     total_received = total_received + 1,
		     total_errors = total_errors + $1
		 WHERE id = $2`,
		errInc, id)
}

// InsertLog creates a webhook log entry.
func (s *WebhookService) InsertLog(ctx context.Context, log WebhookLog) (WebhookLog, error) {
	query := `INSERT INTO webhook_logs
		(endpoint_id, source_ip, headers, payload, signature_valid, action_taken, action_result, error)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, endpoint_id, received_at, source_ip, headers, payload,
		          signature_valid, action_taken, action_result, error`

	return scanWebhookLog(s.pool.QueryRow(ctx, query,
		log.EndpointID, log.SourceIP, log.Headers, log.Payload,
		log.SignatureValid, log.ActionTaken, log.ActionResult, log.Error,
	))
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

func joinStrings(ss []string, sep string) string {
	result := ""
	for i, s := range ss {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}

func mustJSON(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

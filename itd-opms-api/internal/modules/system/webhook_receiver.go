package system

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
)

const maxWebhookPayloadBytes = 1 << 20 // 1 MiB

/* ------------------------------------------------------------------ */
/*  Receiver handler                                                   */
/* ------------------------------------------------------------------ */

// WebhookReceiverHandler handles the public inbound webhook endpoint.
type WebhookReceiverHandler struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
	svc      *WebhookService
	js       nats.JetStreamContext
}

// NewWebhookReceiverHandler creates a new public webhook receiver.
func NewWebhookReceiverHandler(pool *pgxpool.Pool, auditSvc *audit.AuditService, svc *WebhookService, js nats.JetStreamContext) *WebhookReceiverHandler {
	return &WebhookReceiverHandler{pool: pool, auditSvc: auditSvc, svc: svc, js: js}
}

// HandleIncoming processes an inbound webhook POST.
// POST /api/v1/webhooks/custom/{slug}
func (h *WebhookReceiverHandler) HandleIncoming(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := chi.URLParam(r, "slug")

	// Look up endpoint by slug (globally unique).
	ep, err := h.svc.GetEndpointBySlug(ctx, slug)
	if err != nil || !ep.IsActive {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	// Read body (limited).
	body, err := io.ReadAll(io.LimitReader(r.Body, maxWebhookPayloadBytes))
	if err != nil {
		http.Error(w, `{"error":"failed to read body"}`, http.StatusBadRequest)
		return
	}

	// HMAC-SHA256 signature verification.
	sigHeader := r.Header.Get("X-Webhook-Signature")
	sigValid := verifyHMAC(ep.Secret, body, sigHeader)
	sigValidPtr := &sigValid

	// If signature was provided but invalid → reject (but still log).
	if sigHeader != "" && !sigValid {
		logEntry := WebhookLog{
			EndpointID:     ep.ID,
			SourceIP:       strPtr(sourceIP(r)),
			Headers:        collectHeaders(r),
			Payload:        json.RawMessage(body),
			SignatureValid: sigValidPtr,
			Error:          strPtr("invalid signature"),
		}
		_, _ = h.svc.InsertLog(ctx, logEntry)
		h.svc.IncrementStats(ctx, ep.ID, true)
		http.Error(w, `{"error":"invalid signature"}`, http.StatusUnauthorized)
		return
	}

	// Parse payload.
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		logEntry := WebhookLog{
			EndpointID:     ep.ID,
			SourceIP:       strPtr(sourceIP(r)),
			Headers:        collectHeaders(r),
			Payload:        json.RawMessage(body),
			SignatureValid: sigValidPtr,
			Error:          strPtr("invalid JSON payload"),
		}
		_, _ = h.svc.InsertLog(ctx, logEntry)
		h.svc.IncrementStats(ctx, ep.ID, true)
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Execute action.
	actionTaken := ep.TargetAction
	actionResult, actionErr := h.executeAction(ctx, ep, payload)

	var errStr *string
	if actionErr != nil {
		errStr = strPtr(actionErr.Error())
	}

	resultJSON, _ := json.Marshal(actionResult)

	// Log the invocation.
	logEntry := WebhookLog{
		EndpointID:     ep.ID,
		SourceIP:       strPtr(sourceIP(r)),
		Headers:        collectHeaders(r),
		Payload:        json.RawMessage(body),
		SignatureValid: sigValidPtr,
		ActionTaken:    &actionTaken,
		ActionResult:   resultJSON,
		Error:          errStr,
	}
	_, _ = h.svc.InsertLog(ctx, logEntry)
	h.svc.IncrementStats(ctx, ep.ID, actionErr != nil)

	// Respond.
	resp := map[string]any{
		"status": "ok",
		"action": actionTaken,
		"result": actionResult,
	}
	if actionErr != nil {
		resp["status"] = "error"
		resp["error"] = actionErr.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	if actionErr != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
	}
	_ = json.NewEncoder(w).Encode(resp)
}

/* ------------------------------------------------------------------ */
/*  Action dispatch                                                    */
/* ------------------------------------------------------------------ */

func (h *WebhookReceiverHandler) executeAction(ctx context.Context, ep WebhookEndpoint, payload map[string]any) (map[string]any, error) {
	switch ep.TargetAction {
	case "create_ticket":
		return h.executeCreateTicket(ctx, ep, payload)
	case "update_ticket":
		return h.executeUpdateTicket(ctx, ep, payload)
	case "create_ci":
		return h.executeCreateCI(ctx, ep, payload)
	case "trigger_notification":
		return h.executeTriggerNotification(ctx, ep, payload)
	case "log_only":
		return map[string]any{"logged": true}, nil
	default:
		return nil, fmt.Errorf("unsupported action: %s", ep.TargetAction)
	}
}

// ExecuteActionForTest allows the admin handler to test webhook execution.
func (h *WebhookReceiverHandler) ExecuteActionForTest(ctx context.Context, ep WebhookEndpoint, payload map[string]any) (map[string]any, error) {
	return h.executeAction(ctx, ep, payload)
}

/* ------------------------------------------------------------------ */
/*  create_ticket                                                      */
/* ------------------------------------------------------------------ */

func (h *WebhookReceiverHandler) executeCreateTicket(ctx context.Context, ep WebhookEndpoint, payload map[string]any) (map[string]any, error) {
	mapping := getMapping(ep.PayloadTransform)

	title := extractString(payload, mapping["title"], "Webhook ticket")
	description := extractString(payload, mapping["description"], "Created via webhook")
	priority := extractString(payload, mapping["priority"], "P3_medium")
	urgency := extractString(payload, mapping["urgency"], "medium")
	impact := extractString(payload, mapping["impact"], "medium")
	ticketType := extractString(payload, mapping["type"], "incident")
	channel := "webhook"

	var ticketID uuid.UUID
	var ticketNumber string
	err := h.pool.QueryRow(ctx,
		`INSERT INTO tickets
			(tenant_id, type, title, description, priority, urgency, impact,
			 channel, reporter_id, status, sla_paused_duration_minutes,
			 is_major_incident, cab_required, pir_required, pir_completed,
			 related_ticket_ids, linked_asset_ids, tags)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
		         'logged', 0, false, false, false, false, '{}', '{}', '{}')
		 RETURNING id, ticket_number`,
		ep.TenantID, ticketType, title, description, priority, urgency, impact,
		channel, ep.CreatedBy,
	).Scan(&ticketID, &ticketNumber)
	if err != nil {
		return nil, fmt.Errorf("create ticket: %w", err)
	}

	_ = h.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   ep.TenantID,
		ActorID:    ep.CreatedBy,
		Action:     "create:ticket",
		EntityType: "ticket",
		EntityID:   ticketID,
		Changes:    mustJSON(map[string]any{"source": "webhook", "slug": ep.Slug}),
	})

	return map[string]any{"ticketId": ticketID, "ticketNumber": ticketNumber}, nil
}

/* ------------------------------------------------------------------ */
/*  update_ticket                                                      */
/* ------------------------------------------------------------------ */

func (h *WebhookReceiverHandler) executeUpdateTicket(ctx context.Context, ep WebhookEndpoint, payload map[string]any) (map[string]any, error) {
	mapping := getMapping(ep.PayloadTransform)

	ticketRef := extractString(payload, mapping["ticket_number"], "")
	comment := extractString(payload, mapping["comment"], "")
	newStatus := extractString(payload, mapping["status"], "")

	if ticketRef == "" {
		return nil, fmt.Errorf("ticket_number mapping is required for update_ticket")
	}

	// Look up ticket by number within tenant.
	var ticketID uuid.UUID
	err := h.pool.QueryRow(ctx,
		`SELECT id FROM tickets WHERE ticket_number = $1 AND tenant_id = $2`,
		ticketRef, ep.TenantID,
	).Scan(&ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %s", ticketRef)
	}

	result := map[string]any{"ticketId": ticketID, "ticketNumber": ticketRef}

	// Add comment if mapped.
	if comment != "" {
		_, err := h.pool.Exec(ctx,
			`INSERT INTO ticket_comments (ticket_id, author_id, content, is_internal, attachments)
			 VALUES ($1, $2, $3, false, '{}')`,
			ticketID, ep.CreatedBy, comment,
		)
		if err != nil {
			return nil, fmt.Errorf("add comment: %w", err)
		}
		result["commentAdded"] = true
	}

	// Update status if mapped.
	if newStatus != "" {
		_, err := h.pool.Exec(ctx,
			`UPDATE tickets SET status = $1, updated_at = now() WHERE id = $2`,
			newStatus, ticketID,
		)
		if err != nil {
			return nil, fmt.Errorf("update status: %w", err)
		}
		result["statusUpdated"] = newStatus
	}

	return result, nil
}

/* ------------------------------------------------------------------ */
/*  create_ci                                                          */
/* ------------------------------------------------------------------ */

func (h *WebhookReceiverHandler) executeCreateCI(ctx context.Context, ep WebhookEndpoint, payload map[string]any) (map[string]any, error) {
	mapping := getMapping(ep.PayloadTransform)

	name := extractString(payload, mapping["name"], "")
	ciType := extractString(payload, mapping["ci_type"], "application")
	status := extractString(payload, mapping["status"], "active")
	description := extractString(payload, mapping["description"], "")

	if name == "" {
		return nil, fmt.Errorf("name mapping is required for create_ci")
	}

	var ciID uuid.UUID
	err := h.pool.QueryRow(ctx,
		`INSERT INTO cmdb_items (tenant_id, name, ci_type, status, description, custom_fields)
		 VALUES ($1, $2, $3, $4, $5, '{}')
		 RETURNING id`,
		ep.TenantID, name, ciType, status, description,
	).Scan(&ciID)
	if err != nil {
		return nil, fmt.Errorf("create CI: %w", err)
	}

	return map[string]any{"ciId": ciID, "name": name}, nil
}

/* ------------------------------------------------------------------ */
/*  trigger_notification                                               */
/* ------------------------------------------------------------------ */

func (h *WebhookReceiverHandler) executeTriggerNotification(ctx context.Context, ep WebhookEndpoint, payload map[string]any) (map[string]any, error) {
	if h.js == nil {
		return map[string]any{"published": false, "reason": "nats not configured"}, nil
	}

	envelope := map[string]any{
		"tenantId":  ep.TenantID,
		"slug":      ep.Slug,
		"payload":   payload,
		"timestamp": time.Now().UTC(),
	}

	data, err := json.Marshal(envelope)
	if err != nil {
		return nil, fmt.Errorf("marshal notification: %w", err)
	}

	subject := fmt.Sprintf("notify.webhook.%s", ep.Slug)
	if _, err := h.js.Publish(subject, data); err != nil {
		slog.Warn("failed to publish webhook notification", "slug", ep.Slug, "error", err)
		return nil, fmt.Errorf("publish: %w", err)
	}

	return map[string]any{"published": true, "subject": subject}, nil
}

/* ------------------------------------------------------------------ */
/*  HMAC helpers                                                       */
/* ------------------------------------------------------------------ */

func verifyHMAC(secret string, body []byte, signatureHeader string) bool {
	if signatureHeader == "" {
		// No signature provided — treat as valid (allow unsigned webhooks).
		return true
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	// Support "sha256=..." prefix format.
	sig := signatureHeader
	if strings.HasPrefix(sig, "sha256=") {
		sig = strings.TrimPrefix(sig, "sha256=")
	}

	return hmac.Equal([]byte(expected), []byte(sig))
}

/* ------------------------------------------------------------------ */
/*  Field extraction (simple dot-notation JSONPath)                    */
/* ------------------------------------------------------------------ */

// extractField walks a nested map using dot-notation path.
// Example: "$.alert.name" → payload["alert"]["name"]
func extractField(payload map[string]any, path string) any {
	if path == "" {
		return nil
	}

	// Strip leading "$." prefix.
	path = strings.TrimPrefix(path, "$.")
	path = strings.TrimPrefix(path, "$")

	parts := strings.Split(path, ".")
	var current any = payload

	for _, part := range parts {
		if part == "" {
			continue
		}
		m, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current, ok = m[part]
		if !ok {
			return nil
		}
	}
	return current
}

// extractString extracts a string value from the payload using a JSONPath mapping.
func extractString(payload map[string]any, path string, defaultVal string) string {
	if path == "" {
		return defaultVal
	}
	v := extractField(payload, path)
	if v == nil {
		return defaultVal
	}
	if s, ok := v.(string); ok {
		return s
	}
	// Coerce non-string values.
	return fmt.Sprintf("%v", v)
}

// getMapping extracts the "mapping" object from payload_transform JSONB.
func getMapping(transform json.RawMessage) map[string]string {
	var t struct {
		Mapping map[string]string `json:"mapping"`
	}
	if err := json.Unmarshal(transform, &t); err != nil || t.Mapping == nil {
		return map[string]string{}
	}
	return t.Mapping
}

/* ------------------------------------------------------------------ */
/*  Misc helpers                                                       */
/* ------------------------------------------------------------------ */

func sourceIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		parts := strings.SplitN(fwd, ",", 2)
		return strings.TrimSpace(parts[0])
	}
	return r.RemoteAddr
}

func collectHeaders(r *http.Request) json.RawMessage {
	safe := make(map[string]string)
	for key, vals := range r.Header {
		lk := strings.ToLower(key)
		// Skip sensitive headers.
		if lk == "authorization" || lk == "cookie" {
			continue
		}
		safe[key] = strings.Join(vals, ", ")
	}
	b, _ := json.Marshal(safe)
	return b
}

func strPtr(s string) *string {
	return &s
}

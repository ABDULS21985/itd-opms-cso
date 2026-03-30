package system

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

/* ------------------------------------------------------------------ */
/*  Webhook Endpoint                                                   */
/* ------------------------------------------------------------------ */

// WebhookEndpoint represents a configurable inbound webhook receiver.
type WebhookEndpoint struct {
	ID               uuid.UUID       `json:"id"`
	TenantID         uuid.UUID       `json:"tenantId"`
	Name             string          `json:"name"`
	Slug             string          `json:"slug"`
	Description      *string         `json:"description,omitempty"`
	Secret           string          `json:"secret,omitempty"`
	IsActive         bool            `json:"isActive"`
	PayloadTransform json.RawMessage `json:"payloadTransform"`
	TargetAction     string          `json:"targetAction"`
	LastReceivedAt   *time.Time      `json:"lastReceivedAt,omitempty"`
	TotalReceived    int             `json:"totalReceived"`
	TotalErrors      int             `json:"totalErrors"`
	CreatedBy        uuid.UUID       `json:"createdBy"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// WebhookLog records a single invocation of a webhook endpoint.
type WebhookLog struct {
	ID             uuid.UUID       `json:"id"`
	EndpointID     uuid.UUID       `json:"endpointId"`
	ReceivedAt     time.Time       `json:"receivedAt"`
	SourceIP       *string         `json:"sourceIp,omitempty"`
	Headers        json.RawMessage `json:"headers,omitempty"`
	Payload        json.RawMessage `json:"payload,omitempty"`
	SignatureValid *bool           `json:"signatureValid,omitempty"`
	ActionTaken    *string         `json:"actionTaken,omitempty"`
	ActionResult   json.RawMessage `json:"actionResult,omitempty"`
	Error          *string         `json:"error,omitempty"`
}

/* ------------------------------------------------------------------ */
/*  Request / Response                                                 */
/* ------------------------------------------------------------------ */

// CreateWebhookEndpointRequest is the body for POST /system/webhooks.
type CreateWebhookEndpointRequest struct {
	Name             string          `json:"name" validate:"required"`
	Slug             string          `json:"slug" validate:"required"`
	Description      *string         `json:"description"`
	TargetAction     string          `json:"targetAction" validate:"required"`
	PayloadTransform json.RawMessage `json:"payloadTransform"`
}

// UpdateWebhookEndpointRequest is the body for PUT /system/webhooks/{id}.
type UpdateWebhookEndpointRequest struct {
	Name             *string         `json:"name"`
	Description      *string         `json:"description"`
	IsActive         *bool           `json:"isActive"`
	TargetAction     *string         `json:"targetAction"`
	PayloadTransform json.RawMessage `json:"payloadTransform"`
}

// TestWebhookRequest is the body for POST /system/webhooks/{id}/test.
type TestWebhookRequest struct {
	Payload json.RawMessage `json:"payload" validate:"required"`
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Valid target actions.
var validTargetActions = map[string]bool{
	"create_ticket":        true,
	"update_ticket":        true,
	"create_ci":            true,
	"trigger_notification": true,
	"log_only":             true,
}

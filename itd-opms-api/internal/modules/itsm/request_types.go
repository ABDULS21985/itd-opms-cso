package itsm

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Service Request domain types
// ──────────────────────────────────────────────

// ServiceRequest represents a service request submitted against a catalog item.
type ServiceRequest struct {
	ID               uuid.UUID       `json:"id"`
	TenantID         uuid.UUID       `json:"tenantId"`
	RequestNumber    string          `json:"requestNumber"`
	CatalogItemID    uuid.UUID       `json:"catalogItemId"`
	RequesterID      uuid.UUID       `json:"requesterId"`
	Status           string          `json:"status"`
	FormData         json.RawMessage `json:"formData"`
	AssignedTo       *uuid.UUID      `json:"assignedTo"`
	Priority         string          `json:"priority"`
	TicketID         *uuid.UUID      `json:"ticketId"`
	RejectionReason  *string         `json:"rejectionReason"`
	FulfillmentNotes *string         `json:"fulfillmentNotes"`
	FulfilledAt      *time.Time      `json:"fulfilledAt"`
	CancelledAt      *time.Time      `json:"cancelledAt"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
	// Joined fields (populated in some queries)
	CatalogItemName *string `json:"catalogItemName,omitempty"`
}

// ApprovalTask represents a single approval step for a service request.
type ApprovalTask struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenantId"`
	RequestID     uuid.UUID  `json:"requestId"`
	ApproverID    uuid.UUID  `json:"approverId"`
	SequenceOrder int        `json:"sequenceOrder"`
	Status        string     `json:"status"`
	DecisionAt    *time.Time `json:"decisionAt"`
	Comment       *string    `json:"comment"`
	DelegatedTo   *uuid.UUID `json:"delegatedTo"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// RequestTimelineEntry records an event in the lifecycle of a service request.
type RequestTimelineEntry struct {
	ID          uuid.UUID       `json:"id"`
	RequestID   uuid.UUID       `json:"requestId"`
	EventType   string          `json:"eventType"`
	ActorID     uuid.UUID       `json:"actorId"`
	Description *string         `json:"description"`
	Metadata    json.RawMessage `json:"metadata"`
	CreatedAt   time.Time       `json:"createdAt"`
}

// ──────────────────────────────────────────────
// Service request status constants
// ──────────────────────────────────────────────

const (
	RequestStatusPendingApproval = "pending_approval"
	RequestStatusApproved        = "approved"
	RequestStatusRejected        = "rejected"
	RequestStatusInProgress      = "in_progress"
	RequestStatusFulfilled       = "fulfilled"
	RequestStatusCancelled       = "cancelled"
)

// ──────────────────────────────────────────────
// Approval task status constants
// ──────────────────────────────────────────────

const (
	ApprovalTaskStatusPending   = "pending"
	ApprovalTaskStatusApproved  = "approved"
	ApprovalTaskStatusRejected  = "rejected"
	ApprovalTaskStatusDelegated = "delegated"
	ApprovalTaskStatusSkipped   = "skipped"
)

// ──────────────────────────────────────────────
// Request types for API
// ──────────────────────────────────────────────

// SubmitServiceRequestRequest is the payload for submitting a new service request.
type SubmitServiceRequestRequest struct {
	CatalogItemID uuid.UUID       `json:"catalogItemId" validate:"required"`
	FormData      json.RawMessage `json:"formData"`
}

// ApproveRequestRequest is the payload for approving a service request.
type ApproveRequestRequest struct {
	Comment *string `json:"comment"`
}

// RejectRequestRequest is the payload for rejecting a service request.
type RejectRequestRequest struct {
	Reason string `json:"reason" validate:"required"`
}

// ──────────────────────────────────────────────
// Composite types
// ──────────────────────────────────────────────

// ServiceRequestDetail wraps a request with its approval tasks and timeline.
type ServiceRequestDetail struct {
	ServiceRequest
	ApprovalTasks []ApprovalTask         `json:"approvalTasks"`
	Timeline      []RequestTimelineEntry `json:"timeline"`
}

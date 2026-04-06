package approval

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Step mode constants
// ──────────────────────────────────────────────

// StepMode defines how approvers within a single step interact.
type StepMode string

const (
	// StepModeSequential requires all approvers to approve in order.
	StepModeSequential StepMode = "sequential"
	// StepModeParallel requires all approvers to approve (order irrelevant).
	StepModeParallel StepMode = "parallel"
	// StepModeAnyOf requires at least Quorum approvers to approve.
	StepModeAnyOf StepMode = "any_of"
)

// ──────────────────────────────────────────────
// Approval status constants
// ──────────────────────────────────────────────

const (
	ChainStatusPending    = "pending"
	ChainStatusInProgress = "in_progress"
	ChainStatusApproved   = "approved"
	ChainStatusRejected   = "rejected"
	ChainStatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// Decision constants
// ──────────────────────────────────────────────

const (
	DecisionPending  = "pending"
	DecisionApproved = "approved"
	DecisionRejected = "rejected"
	DecisionSkipped  = "skipped"
)

// ──────────────────────────────────────────────
// Urgency constants
// ──────────────────────────────────────────────

const (
	UrgencyLow    = "low"
	UrgencyNormal = "normal"
	UrgencyHigh   = "high"
	UrgencyCritical = "critical"
)

// ──────────────────────────────────────────────
// Domain types — Workflow definitions
// ──────────────────────────────────────────────

// WorkflowStepDef describes a single step within a workflow definition.
type WorkflowStepDef struct {
	StepOrder       int       `json:"stepOrder"`
	Name            string    `json:"name"`
	Mode            StepMode  `json:"mode"`
	Quorum          int       `json:"quorum"`
	ApproverType    string    `json:"approverType"`
	ApproverIDs     []string  `json:"approverIds"`
	TimeoutHours    int       `json:"timeoutHours"`
	AllowDelegation bool      `json:"allowDelegation"`
}

// WorkflowDefinition represents a reusable approval workflow template.
type WorkflowDefinition struct {
	ID              uuid.UUID         `json:"id"`
	TenantID        uuid.UUID         `json:"tenantId"`
	Name            string            `json:"name"`
	Description     *string           `json:"description"`
	EntityType      string            `json:"entityType"`
	Steps           []WorkflowStepDef `json:"steps"`
	IsActive        bool              `json:"isActive"`
	Version         int               `json:"version"`
	AutoAssignRules json.RawMessage   `json:"autoAssignRules,omitempty"`
	CreatedBy       uuid.UUID         `json:"createdBy"`
	OrgUnitID       *uuid.UUID        `json:"orgUnitId,omitempty"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Domain types — Approval chains and steps
// ──────────────────────────────────────────────

// ApprovalChain represents an active approval process for a specific entity.
type ApprovalChain struct {
	ID                   uuid.UUID       `json:"id"`
	EntityType           string          `json:"entityType"`
	EntityID             uuid.UUID       `json:"entityId"`
	TenantID             uuid.UUID       `json:"tenantId"`
	WorkflowDefinitionID uuid.UUID       `json:"workflowDefinitionId"`
	Status               string          `json:"status"`
	CurrentStep          int             `json:"currentStep"`
	Deadline             *time.Time      `json:"deadline"`
	Urgency              string          `json:"urgency"`
	Metadata             json.RawMessage `json:"metadata,omitempty"`
	CreatedBy            uuid.UUID       `json:"createdBy"`
	OrgUnitID            *uuid.UUID      `json:"orgUnitId,omitempty"`
	CreatedAt            time.Time       `json:"createdAt"`
	CompletedAt          *time.Time      `json:"completedAt"`
	Steps                []ApprovalStep  `json:"steps"`
}

// ApprovalStep represents a single approver's step within a chain.
type ApprovalStep struct {
	ID             uuid.UUID  `json:"id"`
	ChainID        uuid.UUID  `json:"chainId"`
	StepOrder      int        `json:"stepOrder"`
	ApproverID     uuid.UUID  `json:"approverId"`
	ApproverName   string     `json:"approverName"`
	Decision       string     `json:"decision"`
	Comments       *string    `json:"comments"`
	DecidedAt      *time.Time `json:"decidedAt"`
	EvidenceRefs   []string   `json:"evidenceRefs"`
	DelegatedFrom  *uuid.UUID `json:"delegatedFrom"`
	ReminderSentAt *time.Time `json:"reminderSentAt"`
	Deadline       *time.Time `json:"deadline"`
	CreatedAt      time.Time  `json:"createdAt"`
}

// ApprovalDelegation records a delegation event.
// DB schema (migration 024): id, tenant_id, delegated_by, delegated_to, step_id, reason, created_at.
type ApprovalDelegation struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	DelegatedBy uuid.UUID `json:"delegatedBy"`
	DelegatedTo uuid.UUID `json:"delegatedTo"`
	StepID      uuid.UUID `json:"stepId"`
	Reason      *string   `json:"reason"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateWorkflowDefinitionRequest is the payload for creating a workflow definition.
type CreateWorkflowDefinitionRequest struct {
	Name            string            `json:"name"`
	Description     *string           `json:"description"`
	EntityType      string            `json:"entityType"`
	Steps           []WorkflowStepDef `json:"steps"`
	AutoAssignRules json.RawMessage   `json:"autoAssignRules,omitempty"`
}

// UpdateWorkflowDefinitionRequest is the payload for updating a workflow definition.
type UpdateWorkflowDefinitionRequest struct {
	Name            *string           `json:"name"`
	Description     *string           `json:"description"`
	EntityType      *string           `json:"entityType"`
	Steps           []WorkflowStepDef `json:"steps"`
	IsActive        *bool             `json:"isActive"`
	AutoAssignRules json.RawMessage   `json:"autoAssignRules,omitempty"`
}

// StartApprovalRequest is the payload for starting a new approval chain.
type StartApprovalRequest struct {
	EntityType           string          `json:"entityType"`
	EntityID             uuid.UUID       `json:"entityId"`
	WorkflowDefinitionID *uuid.UUID      `json:"workflowDefinitionId"`
	Urgency              string          `json:"urgency"`
	Deadline             *time.Time      `json:"deadline"`
	Metadata             json.RawMessage `json:"metadata,omitempty"`
}

// ApprovalDecisionRequest is the payload for approving or rejecting a step.
type ApprovalDecisionRequest struct {
	Decision     string   `json:"decision"`
	Comments     *string  `json:"comments"`
	EvidenceRefs []string `json:"evidenceRefs"`
}

// DelegateApprovalRequest is the payload for delegating a step to another user.
type DelegateApprovalRequest struct {
	ToUserID uuid.UUID `json:"toUserId"`
	Reason   *string   `json:"reason"`
}

// ──────────────────────────────────────────────
// View / summary types
// ──────────────────────────────────────────────

// PendingApprovalItem represents a single pending approval for the current user.
type PendingApprovalItem struct {
	StepID       uuid.UUID  `json:"stepId"`
	ChainID      uuid.UUID  `json:"chainId"`
	EntityType   string     `json:"entityType"`
	EntityID     uuid.UUID  `json:"entityId"`
	StepOrder    int        `json:"stepOrder"`
	StepName     string     `json:"stepName"`
	Urgency      string     `json:"urgency"`
	Deadline     *time.Time `json:"deadline"`
	RequestedBy  string     `json:"requestedBy"`
	RequestedAt  time.Time  `json:"requestedAt"`
	ChainStatus  string     `json:"chainStatus"`
}

// ApprovalHistoryItem represents a completed or active approval entry in the history view.
type ApprovalHistoryItem struct {
	ChainID      uuid.UUID  `json:"chainId"`
	EntityType   string     `json:"entityType"`
	EntityID     uuid.UUID  `json:"entityId"`
	Status       string     `json:"status"`
	CurrentStep  int        `json:"currentStep"`
	TotalSteps   int        `json:"totalSteps"`
	Urgency      string     `json:"urgency"`
	CreatedBy    string     `json:"createdBy"`
	CreatedAt    time.Time  `json:"createdAt"`
	CompletedAt  *time.Time `json:"completedAt"`
}

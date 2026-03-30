package release

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Entity structs
// ──────────────────────────────────────────────

// Release represents a release management record.
type Release struct {
	ID                        uuid.UUID        `json:"id"`
	TenantID                  uuid.UUID        `json:"tenantId"`
	ReleaseNumber             string           `json:"releaseNumber"`
	Title                     string           `json:"title"`
	Description               *string          `json:"description,omitempty"`
	ReleaseType               string           `json:"releaseType"`
	Status                    string           `json:"status"`
	PlannedStart              *time.Time       `json:"plannedStart,omitempty"`
	PlannedEnd                *time.Time       `json:"plannedEnd,omitempty"`
	ActualStart               *time.Time       `json:"actualStart,omitempty"`
	ActualEnd                 *time.Time       `json:"actualEnd,omitempty"`
	ReleaseManagerID          *uuid.UUID       `json:"releaseManagerId,omitempty"`
	DeploymentTeam            []uuid.UUID      `json:"deploymentTeam"`
	Environment               string           `json:"environment"`
	DeploymentPlan            *string          `json:"deploymentPlan,omitempty"`
	RollbackPlan              *string          `json:"rollbackPlan,omitempty"`
	RiskAssessment            json.RawMessage  `json:"riskAssessment,omitempty"`
	ReadinessChecklist        json.RawMessage  `json:"readinessChecklist,omitempty"`
	ChangeTicketIDs           []uuid.UUID      `json:"changeTicketIds"`
	ImplementationCertificate json.RawMessage  `json:"implementationCertificate,omitempty"`
	CloseOutReport            *string          `json:"closeOutReport,omitempty"`
	LessonsLearned            *string          `json:"lessonsLearned,omitempty"`
	CreatedBy                 uuid.UUID        `json:"createdBy"`
	CreatedAt                 time.Time        `json:"createdAt"`
	UpdatedAt                 time.Time        `json:"updatedAt"`
	// Enrichment fields (JOIN)
	ReleaseManagerName *string `json:"releaseManagerName,omitempty"`
	CreatedByName      *string `json:"createdByName,omitempty"`
}

// ReleaseItem represents an item included in a release.
type ReleaseItem struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	ReleaseID   uuid.UUID  `json:"releaseId"`
	ItemType    string     `json:"itemType"`
	Name        string     `json:"name"`
	Version     *string    `json:"version,omitempty"`
	Description *string    `json:"description,omitempty"`
	CIID        *uuid.UUID `json:"ciId,omitempty"`
	Status      string     `json:"status"`
	DeployOrder int        `json:"deployOrder"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// ReleaseDeployment tracks execution of a release deployment.
type ReleaseDeployment struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenantId"`
	ReleaseID      uuid.UUID  `json:"releaseId"`
	Environment    string     `json:"environment"`
	DeploymentType string     `json:"deploymentType"`
	Status         string     `json:"status"`
	StartedAt      *time.Time `json:"startedAt,omitempty"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
	DeployedBy     *uuid.UUID `json:"deployedBy,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	// Enrichment
	DeployedByName *string `json:"deployedByName,omitempty"`
}

// ReleaseApproval tracks sign-off for implementation certificate.
type ReleaseApproval struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	ReleaseID    uuid.UUID  `json:"releaseId"`
	ApproverID   uuid.UUID  `json:"approverId"`
	ApprovalType string     `json:"approvalType"`
	Status       string     `json:"status"`
	Comments     *string    `json:"comments,omitempty"`
	DecidedAt    *time.Time `json:"decidedAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	// Enrichment
	ApproverName *string `json:"approverName,omitempty"`
}

// ReleaseWithDetails is the full release view with sub-resources.
type ReleaseWithDetails struct {
	Release
	Items       []ReleaseItem       `json:"items"`
	Deployments []ReleaseDeployment `json:"deployments"`
	Approvals   []ReleaseApproval   `json:"approvals"`
}

// ReleaseStats holds per-status counts for dashboard.
type ReleaseStats struct {
	Planning  int `json:"planning"`
	Build     int `json:"build"`
	Testing   int `json:"testing"`
	Approved  int `json:"approved"`
	Scheduled int `json:"scheduled"`
	Deploying int `json:"deploying"`
	Deployed  int `json:"deployed"`
	RolledBack int `json:"rolledBack"`
	Closed    int `json:"closed"`
	Cancelled int `json:"cancelled"`
	Total     int `json:"total"`
}

// ──────────────────────────────────────────────
// Request structs
// ──────────────────────────────────────────────

// CreateReleaseRequest is the payload for creating a new release.
type CreateReleaseRequest struct {
	Title              string          `json:"title"`
	Description        *string         `json:"description,omitempty"`
	ReleaseType        string          `json:"releaseType"`
	Environment        string          `json:"environment,omitempty"`
	PlannedStart       *time.Time      `json:"plannedStart,omitempty"`
	PlannedEnd         *time.Time      `json:"plannedEnd,omitempty"`
	ReleaseManagerID   *uuid.UUID      `json:"releaseManagerId,omitempty"`
	DeploymentTeam     []uuid.UUID     `json:"deploymentTeam,omitempty"`
	DeploymentPlan     *string         `json:"deploymentPlan,omitempty"`
	RollbackPlan       *string         `json:"rollbackPlan,omitempty"`
	RiskAssessment     json.RawMessage `json:"riskAssessment,omitempty"`
	ReadinessChecklist json.RawMessage `json:"readinessChecklist,omitempty"`
	ChangeTicketIDs    []uuid.UUID     `json:"changeTicketIds,omitempty"`
}

// UpdateReleaseRequest is the payload for updating a release.
type UpdateReleaseRequest struct {
	Title              *string         `json:"title,omitempty"`
	Description        *string         `json:"description,omitempty"`
	ReleaseType        *string         `json:"releaseType,omitempty"`
	Environment        *string         `json:"environment,omitempty"`
	PlannedStart       *time.Time      `json:"plannedStart,omitempty"`
	PlannedEnd         *time.Time      `json:"plannedEnd,omitempty"`
	ReleaseManagerID   *uuid.UUID      `json:"releaseManagerId,omitempty"`
	DeploymentTeam     []uuid.UUID     `json:"deploymentTeam,omitempty"`
	DeploymentPlan     *string         `json:"deploymentPlan,omitempty"`
	RollbackPlan       *string         `json:"rollbackPlan,omitempty"`
	RiskAssessment     json.RawMessage `json:"riskAssessment,omitempty"`
	ReadinessChecklist json.RawMessage `json:"readinessChecklist,omitempty"`
	ChangeTicketIDs    []uuid.UUID     `json:"changeTicketIds,omitempty"`
}

// TransitionReleaseRequest is the payload for status transitions.
type TransitionReleaseRequest struct {
	TargetStatus string  `json:"targetStatus"`
	Comment      *string `json:"comment,omitempty"`
}

// DeployReleaseRequest is the payload for starting a deployment.
type DeployReleaseRequest struct {
	Environment    string  `json:"environment,omitempty"`
	DeploymentType string  `json:"deploymentType"`
	Notes          *string `json:"notes,omitempty"`
}

// RollbackReleaseRequest is the payload for rolling back.
type RollbackReleaseRequest struct {
	Reason string `json:"reason"`
}

// CloseReleaseRequest is the payload for close-out.
type CloseReleaseRequest struct {
	CloseOutReport *string `json:"closeOutReport,omitempty"`
	LessonsLearned *string `json:"lessonsLearned,omitempty"`
}

// CreateReleaseItemRequest is the payload for adding an item to a release.
type CreateReleaseItemRequest struct {
	ItemType    string     `json:"itemType"`
	Name        string     `json:"name"`
	Version     *string    `json:"version,omitempty"`
	Description *string    `json:"description,omitempty"`
	CIID        *uuid.UUID `json:"ciId,omitempty"`
	DeployOrder int        `json:"deployOrder,omitempty"`
}

// CreateReleaseDeploymentRequest is the payload for adding a deployment record.
type CreateReleaseDeploymentRequest struct {
	Environment    string  `json:"environment"`
	DeploymentType string  `json:"deploymentType"`
	Notes          *string `json:"notes,omitempty"`
}

// CreateReleaseApprovalRequest is the payload for requesting an approval.
type CreateReleaseApprovalRequest struct {
	ApproverID   uuid.UUID `json:"approverId"`
	ApprovalType string    `json:"approvalType"`
}

// DecideReleaseApprovalRequest is the payload for an approver's decision.
type DecideReleaseApprovalRequest struct {
	Status   string  `json:"status"`
	Comments *string `json:"comments,omitempty"`
}

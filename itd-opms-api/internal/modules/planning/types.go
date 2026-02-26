package planning

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Project status constants
// ──────────────────────────────────────────────

const (
	ProjectStatusProposed  = "proposed"
	ProjectStatusApproved  = "approved"
	ProjectStatusActive    = "active"
	ProjectStatusOnHold    = "on_hold"
	ProjectStatusCompleted = "completed"
	ProjectStatusCancelled = "cancelled"
)

// ──────────────────────────────────────────────
// RAG status constants
// ──────────────────────────────────────────────

const (
	RAGGreen = "green"
	RAGAmber = "amber"
	RAGRed   = "red"
)

// ──────────────────────────────────────────────
// Work item type constants
// ──────────────────────────────────────────────

const (
	WorkItemTypeEpic      = "epic"
	WorkItemTypeStory     = "story"
	WorkItemTypeTask      = "task"
	WorkItemTypeSubtask   = "subtask"
	WorkItemTypeMilestone = "milestone"
)

// ──────────────────────────────────────────────
// Work item status constants
// ──────────────────────────────────────────────

const (
	WorkItemStatusTodo       = "todo"
	WorkItemStatusInProgress = "in_progress"
	WorkItemStatusInReview   = "in_review"
	WorkItemStatusDone       = "done"
	WorkItemStatusBlocked    = "blocked"
)

// ──────────────────────────────────────────────
// Priority constants
// ──────────────────────────────────────────────

const (
	PriorityCritical = "critical"
	PriorityHigh     = "high"
	PriorityMedium   = "medium"
	PriorityLow      = "low"
)

// ──────────────────────────────────────────────
// Risk likelihood / impact level constants
// ──────────────────────────────────────────────

const (
	LevelVeryLow  = "very_low"
	LevelLow      = "low"
	LevelMedium   = "medium"
	LevelHigh     = "high"
	LevelVeryHigh = "very_high"
)

// ──────────────────────────────────────────────
// Risk status constants
// ──────────────────────────────────────────────

const (
	RiskStatusIdentified = "identified"
	RiskStatusAssessed   = "assessed"
	RiskStatusMitigating = "mitigating"
	RiskStatusAccepted   = "accepted"
	RiskStatusClosed     = "closed"
)

// ──────────────────────────────────────────────
// Issue status constants
// ──────────────────────────────────────────────

const (
	IssueStatusOpen          = "open"
	IssueStatusInvestigating = "investigating"
	IssueStatusResolved      = "resolved"
	IssueStatusClosed        = "closed"
)

// ──────────────────────────────────────────────
// Change request status constants
// ──────────────────────────────────────────────

const (
	CRStatusSubmitted   = "submitted"
	CRStatusUnderReview = "under_review"
	CRStatusApproved    = "approved"
	CRStatusRejected    = "rejected"
	CRStatusImplemented = "implemented"
)

// ──────────────────────────────────────────────
// Milestone status constants
// ──────────────────────────────────────────────

const (
	MilestoneStatusPending   = "pending"
	MilestoneStatusCompleted = "completed"
	MilestoneStatusMissed    = "missed"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// Portfolio represents a collection of projects grouped by fiscal year.
type Portfolio struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	OwnerID     *uuid.UUID `json:"ownerId"`
	FiscalYear  int        `json:"fiscalYear"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// Project represents a managed IT project within a portfolio.
type Project struct {
	ID               uuid.UUID       `json:"id"`
	TenantID         uuid.UUID       `json:"tenantId"`
	PortfolioID      *uuid.UUID      `json:"portfolioId"`
	Title            string          `json:"title"`
	Code             string          `json:"code"`
	Description      *string         `json:"description"`
	Charter          *string         `json:"charter"`
	Scope            *string         `json:"scope"`
	BusinessCase     *string         `json:"businessCase"`
	SponsorID        *uuid.UUID      `json:"sponsorId"`
	ProjectManagerID *uuid.UUID      `json:"projectManagerId"`
	Status           string          `json:"status"`
	RAGStatus        string          `json:"ragStatus"`
	Priority         string          `json:"priority"`
	PlannedStart     *time.Time      `json:"plannedStart"`
	PlannedEnd       *time.Time      `json:"plannedEnd"`
	ActualStart      *time.Time      `json:"actualStart"`
	ActualEnd        *time.Time      `json:"actualEnd"`
	BudgetApproved   *float64        `json:"budgetApproved"`
	BudgetSpent      *float64        `json:"budgetSpent"`
	CompletionPct    *float64        `json:"completionPct"`
	Metadata         json.RawMessage `json:"metadata"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// ProjectDependency represents a dependency link between two projects.
type ProjectDependency struct {
	ID                 uuid.UUID `json:"id"`
	ProjectID          uuid.UUID `json:"projectId"`
	DependsOnProjectID uuid.UUID `json:"dependsOnProjectId"`
	DependencyType     string    `json:"dependencyType"`
	Description        *string   `json:"description"`
	ImpactIfDelayed    *string   `json:"impactIfDelayed"`
	CreatedAt          time.Time `json:"createdAt"`
}

// ProjectStakeholder represents a stakeholder assigned to a project.
type ProjectStakeholder struct {
	ID                      uuid.UUID `json:"id"`
	ProjectID               uuid.UUID `json:"projectId"`
	UserID                  uuid.UUID `json:"userId"`
	Role                    string    `json:"role"`
	Influence               *string   `json:"influence"`
	Interest                *string   `json:"interest"`
	CommunicationPreference *string   `json:"communicationPreference"`
	CreatedAt               time.Time `json:"createdAt"`
}

// WorkItem represents a task, story, epic, or subtask within a project WBS.
type WorkItem struct {
	ID             uuid.UUID       `json:"id"`
	TenantID       uuid.UUID       `json:"tenantId"`
	ProjectID      uuid.UUID       `json:"projectId"`
	ParentID       *uuid.UUID      `json:"parentId"`
	Type           string          `json:"type"`
	Title          string          `json:"title"`
	Description    *string         `json:"description"`
	AssigneeID     *uuid.UUID      `json:"assigneeId"`
	ReporterID     *uuid.UUID      `json:"reporterId"`
	Status         string          `json:"status"`
	Priority       string          `json:"priority"`
	EstimatedHours *float64        `json:"estimatedHours"`
	ActualHours    *float64        `json:"actualHours"`
	DueDate        *time.Time      `json:"dueDate"`
	CompletedAt    *time.Time      `json:"completedAt"`
	SortOrder      int             `json:"sortOrder"`
	Tags           []string        `json:"tags"`
	Metadata       json.RawMessage `json:"metadata"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	Children       []WorkItem      `json:"children,omitempty"`
}

// Milestone represents a key project milestone with a target date.
type Milestone struct {
	ID                 uuid.UUID   `json:"id"`
	TenantID           uuid.UUID   `json:"tenantId"`
	ProjectID          uuid.UUID   `json:"projectId"`
	Title              string      `json:"title"`
	Description        *string     `json:"description"`
	TargetDate         time.Time   `json:"targetDate"`
	ActualDate         *time.Time  `json:"actualDate"`
	Status             string      `json:"status"`
	EvidenceRefs       []uuid.UUID `json:"evidenceRefs"`
	CompletionCriteria *string     `json:"completionCriteria"`
	CreatedAt          time.Time   `json:"createdAt"`
	UpdatedAt          time.Time   `json:"updatedAt"`
}

// TimeEntry represents logged time against a work item.
type TimeEntry struct {
	ID          uuid.UUID `json:"id"`
	WorkItemID  uuid.UUID `json:"workItemId"`
	UserID      uuid.UUID `json:"userId"`
	Hours       float64   `json:"hours"`
	Description *string   `json:"description"`
	LoggedDate  time.Time `json:"loggedDate"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Risk represents an entry in the project/tenant risk register.
type Risk struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenantId"`
	ProjectID       *uuid.UUID `json:"projectId"`
	Title           string     `json:"title"`
	Description     *string    `json:"description"`
	Category        *string    `json:"category"`
	Likelihood      string     `json:"likelihood"`
	Impact          string     `json:"impact"`
	RiskScore       int        `json:"riskScore"`
	Status          string     `json:"status"`
	MitigationPlan  *string    `json:"mitigationPlan"`
	ContingencyPlan *string    `json:"contingencyPlan"`
	OwnerID         *uuid.UUID `json:"ownerId"`
	ReviewDate      *time.Time `json:"reviewDate"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// Issue represents a tracked issue for a project or tenant.
type Issue struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenantId"`
	ProjectID       *uuid.UUID `json:"projectId"`
	Title           string     `json:"title"`
	Description     *string    `json:"description"`
	Category        *string    `json:"category"`
	Severity        string     `json:"severity"`
	Status          string     `json:"status"`
	AssigneeID      *uuid.UUID `json:"assigneeId"`
	Resolution      *string    `json:"resolution"`
	EscalationLevel int        `json:"escalationLevel"`
	EscalatedToID   *uuid.UUID `json:"escalatedToId"`
	DueDate         *time.Time `json:"dueDate"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// ChangeRequest represents a formal change request tied to a project.
type ChangeRequest struct {
	ID               uuid.UUID  `json:"id"`
	TenantID         uuid.UUID  `json:"tenantId"`
	ProjectID        *uuid.UUID `json:"projectId"`
	Title            string     `json:"title"`
	Description      *string    `json:"description"`
	Justification    *string    `json:"justification"`
	ImpactAssessment *string    `json:"impactAssessment"`
	Status           string     `json:"status"`
	RequestedBy      uuid.UUID  `json:"requestedBy"`
	ReviewedBy       *uuid.UUID `json:"reviewedBy"`
	ApprovalChainID  *uuid.UUID `json:"approvalChainId"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Composite / summary types
// ──────────────────────────────────────────────

// PortfolioAnalytics provides aggregate statistics for a portfolio.
type PortfolioAnalytics struct {
	TotalProjects       int            `json:"totalProjects"`
	ActiveProjects      int            `json:"activeProjects"`
	CompletedProjects   int            `json:"completedProjects"`
	OnTimeDeliveryPct   float64        `json:"onTimeDeliveryPct"`
	AvgCompletionPct    float64        `json:"avgCompletionPct"`
	TotalBudgetApproved float64        `json:"totalBudgetApproved"`
	TotalBudgetSpent    float64        `json:"totalBudgetSpent"`
	RAGSummary          map[string]int `json:"ragSummary"`
}

// WorkItemStatusCount holds an aggregated count of work items per status.
type WorkItemStatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreatePortfolioRequest is the payload for creating a new portfolio.
type CreatePortfolioRequest struct {
	Name        string     `json:"name" validate:"required"`
	Description *string    `json:"description"`
	OwnerID     *uuid.UUID `json:"ownerId"`
	FiscalYear  int        `json:"fiscalYear" validate:"required"`
	Status      *string    `json:"status"`
}

// UpdatePortfolioRequest is the payload for updating an existing portfolio.
type UpdatePortfolioRequest struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	OwnerID     *uuid.UUID `json:"ownerId"`
	FiscalYear  *int       `json:"fiscalYear"`
	Status      *string    `json:"status"`
}

// CreateProjectRequest is the payload for creating a new project.
type CreateProjectRequest struct {
	PortfolioID      *uuid.UUID      `json:"portfolioId"`
	Title            string          `json:"title" validate:"required"`
	Code             string          `json:"code" validate:"required"`
	Description      *string         `json:"description"`
	Charter          *string         `json:"charter"`
	Scope            *string         `json:"scope"`
	BusinessCase     *string         `json:"businessCase"`
	SponsorID        *uuid.UUID      `json:"sponsorId"`
	ProjectManagerID *uuid.UUID      `json:"projectManagerId"`
	Status           *string         `json:"status"`
	RAGStatus        *string         `json:"ragStatus"`
	Priority         *string         `json:"priority"`
	PlannedStart     *time.Time      `json:"plannedStart"`
	PlannedEnd       *time.Time      `json:"plannedEnd"`
	BudgetApproved   *float64        `json:"budgetApproved"`
	Metadata         json.RawMessage `json:"metadata"`
}

// UpdateProjectRequest is the payload for updating an existing project.
type UpdateProjectRequest struct {
	PortfolioID      *uuid.UUID      `json:"portfolioId"`
	Title            *string         `json:"title"`
	Code             *string         `json:"code"`
	Description      *string         `json:"description"`
	Charter          *string         `json:"charter"`
	Scope            *string         `json:"scope"`
	BusinessCase     *string         `json:"businessCase"`
	SponsorID        *uuid.UUID      `json:"sponsorId"`
	ProjectManagerID *uuid.UUID      `json:"projectManagerId"`
	Status           *string         `json:"status"`
	RAGStatus        *string         `json:"ragStatus"`
	Priority         *string         `json:"priority"`
	PlannedStart     *time.Time      `json:"plannedStart"`
	PlannedEnd       *time.Time      `json:"plannedEnd"`
	ActualStart      *time.Time      `json:"actualStart"`
	ActualEnd        *time.Time      `json:"actualEnd"`
	BudgetApproved   *float64        `json:"budgetApproved"`
	BudgetSpent      *float64        `json:"budgetSpent"`
	CompletionPct    *float64        `json:"completionPct"`
	Metadata         json.RawMessage `json:"metadata"`
}

// ApproveProjectRequest is the payload for approving a project proposal.
type ApproveProjectRequest struct {
	Status    string  `json:"status" validate:"required"`
	RAGStatus *string `json:"ragStatus"`
}

// CreateProjectDependencyRequest is the payload for adding a project dependency.
type CreateProjectDependencyRequest struct {
	DependsOnProjectID uuid.UUID `json:"dependsOnProjectId" validate:"required"`
	DependencyType     *string   `json:"dependencyType"`
	Description        *string   `json:"description"`
	ImpactIfDelayed    *string   `json:"impactIfDelayed"`
}

// AddProjectStakeholderRequest is the payload for adding a stakeholder to a project.
type AddProjectStakeholderRequest struct {
	UserID                  uuid.UUID `json:"userId" validate:"required"`
	Role                    string    `json:"role" validate:"required"`
	Influence               *string   `json:"influence"`
	Interest                *string   `json:"interest"`
	CommunicationPreference *string   `json:"communicationPreference"`
}

// CreateWorkItemRequest is the payload for creating a new work item.
type CreateWorkItemRequest struct {
	ProjectID      uuid.UUID       `json:"projectId" validate:"required"`
	ParentID       *uuid.UUID      `json:"parentId"`
	Type           *string         `json:"type"`
	Title          string          `json:"title" validate:"required"`
	Description    *string         `json:"description"`
	AssigneeID     *uuid.UUID      `json:"assigneeId"`
	ReporterID     *uuid.UUID      `json:"reporterId"`
	Status         *string         `json:"status"`
	Priority       *string         `json:"priority"`
	EstimatedHours *float64        `json:"estimatedHours"`
	DueDate        *time.Time      `json:"dueDate"`
	SortOrder      *int            `json:"sortOrder"`
	Tags           []string        `json:"tags"`
	Metadata       json.RawMessage `json:"metadata"`
}

// UpdateWorkItemRequest is the payload for updating an existing work item.
type UpdateWorkItemRequest struct {
	ParentID       *uuid.UUID      `json:"parentId"`
	Type           *string         `json:"type"`
	Title          *string         `json:"title"`
	Description    *string         `json:"description"`
	AssigneeID     *uuid.UUID      `json:"assigneeId"`
	ReporterID     *uuid.UUID      `json:"reporterId"`
	Status         *string         `json:"status"`
	Priority       *string         `json:"priority"`
	EstimatedHours *float64        `json:"estimatedHours"`
	ActualHours    *float64        `json:"actualHours"`
	DueDate        *time.Time      `json:"dueDate"`
	SortOrder      *int            `json:"sortOrder"`
	Tags           []string        `json:"tags"`
	Metadata       json.RawMessage `json:"metadata"`
}

// TransitionWorkItemRequest is the payload for transitioning a work item status.
type TransitionWorkItemRequest struct {
	Status string `json:"status" validate:"required"`
}

// CreateMilestoneRequest is the payload for creating a new milestone.
type CreateMilestoneRequest struct {
	ProjectID          uuid.UUID   `json:"projectId" validate:"required"`
	Title              string      `json:"title" validate:"required"`
	Description        *string     `json:"description"`
	TargetDate         time.Time   `json:"targetDate" validate:"required"`
	Status             *string     `json:"status"`
	EvidenceRefs       []uuid.UUID `json:"evidenceRefs"`
	CompletionCriteria *string     `json:"completionCriteria"`
}

// UpdateMilestoneRequest is the payload for updating an existing milestone.
type UpdateMilestoneRequest struct {
	Title              *string     `json:"title"`
	Description        *string     `json:"description"`
	TargetDate         *time.Time  `json:"targetDate"`
	ActualDate         *time.Time  `json:"actualDate"`
	Status             *string     `json:"status"`
	EvidenceRefs       []uuid.UUID `json:"evidenceRefs"`
	CompletionCriteria *string     `json:"completionCriteria"`
}

// CreateTimeEntryRequest is the payload for logging time against a work item.
type CreateTimeEntryRequest struct {
	WorkItemID  uuid.UUID  `json:"workItemId" validate:"required"`
	Hours       float64    `json:"hours" validate:"required"`
	Description *string    `json:"description"`
	LoggedDate  *time.Time `json:"loggedDate"`
}

// CreateRiskRequest is the payload for adding a risk to the register.
type CreateRiskRequest struct {
	ProjectID       *uuid.UUID `json:"projectId"`
	Title           string     `json:"title" validate:"required"`
	Description     *string    `json:"description"`
	Category        *string    `json:"category"`
	Likelihood      string     `json:"likelihood" validate:"required"`
	Impact          string     `json:"impact" validate:"required"`
	Status          *string    `json:"status"`
	MitigationPlan  *string    `json:"mitigationPlan"`
	ContingencyPlan *string    `json:"contingencyPlan"`
	OwnerID         *uuid.UUID `json:"ownerId"`
	ReviewDate      *time.Time `json:"reviewDate"`
}

// UpdateRiskRequest is the payload for updating an existing risk.
type UpdateRiskRequest struct {
	ProjectID       *uuid.UUID `json:"projectId"`
	Title           *string    `json:"title"`
	Description     *string    `json:"description"`
	Category        *string    `json:"category"`
	Likelihood      *string    `json:"likelihood"`
	Impact          *string    `json:"impact"`
	Status          *string    `json:"status"`
	MitigationPlan  *string    `json:"mitigationPlan"`
	ContingencyPlan *string    `json:"contingencyPlan"`
	OwnerID         *uuid.UUID `json:"ownerId"`
	ReviewDate      *time.Time `json:"reviewDate"`
}

// CreateIssueRequest is the payload for creating a new issue.
type CreateIssueRequest struct {
	ProjectID   *uuid.UUID `json:"projectId"`
	Title       string     `json:"title" validate:"required"`
	Description *string    `json:"description"`
	Category    *string    `json:"category"`
	Severity    string     `json:"severity" validate:"required"`
	Status      *string    `json:"status"`
	AssigneeID  *uuid.UUID `json:"assigneeId"`
	DueDate     *time.Time `json:"dueDate"`
}

// UpdateIssueRequest is the payload for updating an existing issue.
type UpdateIssueRequest struct {
	ProjectID       *uuid.UUID `json:"projectId"`
	Title           *string    `json:"title"`
	Description     *string    `json:"description"`
	Category        *string    `json:"category"`
	Severity        *string    `json:"severity"`
	Status          *string    `json:"status"`
	AssigneeID      *uuid.UUID `json:"assigneeId"`
	Resolution      *string    `json:"resolution"`
	EscalationLevel *int       `json:"escalationLevel"`
	EscalatedToID   *uuid.UUID `json:"escalatedToId"`
	DueDate         *time.Time `json:"dueDate"`
}

// CreateChangeRequestRequest is the payload for submitting a change request.
type CreateChangeRequestRequest struct {
	ProjectID        *uuid.UUID `json:"projectId"`
	Title            string     `json:"title" validate:"required"`
	Description      *string    `json:"description"`
	Justification    *string    `json:"justification"`
	ImpactAssessment *string    `json:"impactAssessment"`
	Status           *string    `json:"status"`
}

// UpdateChangeRequestRequest is the payload for updating a change request.
type UpdateChangeRequestRequest struct {
	ProjectID        *uuid.UUID `json:"projectId"`
	Title            *string    `json:"title"`
	Description      *string    `json:"description"`
	Justification    *string    `json:"justification"`
	ImpactAssessment *string    `json:"impactAssessment"`
	Status           *string    `json:"status"`
	ReviewedBy       *uuid.UUID `json:"reviewedBy"`
	ApprovalChainID  *uuid.UUID `json:"approvalChainId"`
}

// UpdateChangeRequestStatusRequest is the payload for transitioning a change request status.
type UpdateChangeRequestStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

// EscalateIssueRequest is the payload for escalating an issue.
type EscalateIssueRequest struct {
	EscalatedToID uuid.UUID `json:"escalatedToId" validate:"required"`
}

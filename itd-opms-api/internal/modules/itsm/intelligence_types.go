package itsm

import (
	"time"

	"github.com/google/uuid"
)

// TriageRequest is the payload used by the assistant while a ticket is being created.
type TriageRequest struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Type            string   `json:"type"`
	Urgency         string   `json:"urgency"`
	Impact          string   `json:"impact"`
	Channel         string   `json:"channel"`
	AffectedService string   `json:"affectedService"`
	Tags            []string `json:"tags"`
}

// IntelligenceReference points to a related system object that influenced a recommendation.
type IntelligenceReference struct {
	ID         string   `json:"id,omitempty"`
	Label      string   `json:"label"`
	Type       string   `json:"type"`
	Confidence float64  `json:"confidence"`
	Reason     string   `json:"reason"`
	Metadata   []string `json:"metadata,omitempty"`
}

// TriageSuggestion is the deterministic recommendation returned for ticket intake.
type TriageSuggestion struct {
	Category       string                  `json:"category"`
	Subcategory    string                  `json:"subcategory"`
	Priority       string                  `json:"priority"`
	Queue          *IntelligenceReference  `json:"queue,omitempty"`
	Assignee       *IntelligenceReference  `json:"assignee,omitempty"`
	RelatedCIs     []IntelligenceReference `json:"relatedCis"`
	KnownErrors    []IntelligenceReference `json:"knownErrors"`
	KBArticles     []IntelligenceReference `json:"kbArticles"`
	RequiredFields []string                `json:"requiredFields"`
	Explanation    []string                `json:"explanation"`
	Confidence     float64                 `json:"confidence"`
}

// CopilotRequest provides current record context for operator assistance.
type CopilotRequest struct {
	Ticket   *CopilotTicketContext    `json:"ticket,omitempty"`
	Comments []CopilotCommentContext  `json:"comments"`
	History  []CopilotHistoryContext  `json:"history"`
}

type CopilotTicketContext struct {
	ID              string `json:"id,omitempty"`
	TicketNumber    string `json:"ticketNumber,omitempty"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	Status          string `json:"status"`
	Priority        string `json:"priority"`
	Urgency         string `json:"urgency"`
	Impact          string `json:"impact"`
	Category        string `json:"category,omitempty"`
	AssigneeName    string `json:"assigneeName,omitempty"`
	TeamQueueName   string `json:"teamQueueName,omitempty"`
	ResolutionNotes string `json:"resolutionNotes,omitempty"`
}

type CopilotCommentContext struct {
	AuthorName string    `json:"authorName,omitempty"`
	Content    string    `json:"content"`
	IsInternal bool      `json:"isInternal"`
	CreatedAt time.Time `json:"createdAt"`
}

type CopilotHistoryContext struct {
	FromStatus string    `json:"fromStatus"`
	ToStatus   string    `json:"toStatus"`
	Reason     string    `json:"reason,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

// CopilotResponse contains summaries and drafted operator work products.
type CopilotResponse struct {
	Summary        string   `json:"summary"`
	NextAction     string   `json:"nextAction"`
	CustomerReply  string   `json:"customerReply"`
	InternalNote   string   `json:"internalNote"`
	KBDraftTitle    string   `json:"kbDraftTitle"`
	KBDraftBody     string   `json:"kbDraftBody"`
	DecisionQuality []string `json:"decisionQuality"`
}

// WorkflowSimulationRequest dry-runs lifecycle behavior before a workflow is published.
type WorkflowSimulationRequest struct {
	Entity           string            `json:"entity"`
	CurrentStatus    string            `json:"currentStatus"`
	TargetStatus     string            `json:"targetStatus"`
	Priority         string            `json:"priority"`
	IsMajorIncident  bool              `json:"isMajorIncident"`
	PIRRequired      bool              `json:"pirRequired"`
	PIRCompleted     bool              `json:"pirCompleted"`
	CABRequired      bool              `json:"cabRequired"`
	CABDecision      string            `json:"cabDecision"`
	ProvidedFields   map[string]string `json:"providedFields"`
	CheckedChecklist []string          `json:"checkedChecklist"`
}

// WorkflowSimulationResult describes whether a transition would be executable.
type WorkflowSimulationResult struct {
	Allowed        bool     `json:"allowed"`
	Message        string   `json:"message"`
	Blockers       []string `json:"blockers"`
	RequiredFields []string `json:"requiredFields"`
	Checklist       []ITSMWorkflowChecklistItem `json:"checklist"`
	SideEffects    []string `json:"sideEffects"`
	Notifications  []string `json:"notifications"`
	AuditTrail      []string `json:"auditTrail"`
}

// ImpactMapResponse represents business-service impact around a record.
type ImpactMapResponse struct {
	EntityType string          `json:"entityType"`
	EntityID   string          `json:"entityId"`
	Nodes      []ImpactMapNode `json:"nodes"`
	Edges      []ImpactMapEdge `json:"edges"`
	Signals    []string        `json:"signals"`
}

type ImpactMapNode struct {
	ID       string            `json:"id"`
	Label    string            `json:"label"`
	Type     string            `json:"type"`
	Status   string            `json:"status,omitempty"`
	Severity string            `json:"severity,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

type ImpactMapEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Label  string `json:"label"`
}

// ProcessMiningResponse highlights queue and workflow bottlenecks.
type ProcessMiningResponse struct {
	GeneratedAt       time.Time                 `json:"generatedAt"`
	QueueBottlenecks  []ProcessBottleneck       `json:"queueBottlenecks"`
	ApprovalDelays    []ProcessBottleneck       `json:"approvalDelays"`
	SLAHotspots       []ProcessBottleneck       `json:"slaHotspots"`
	ReassignmentLoops []ProcessBottleneck       `json:"reassignmentLoops"`
	Recommendations   []string                  `json:"recommendations"`
	Metrics           map[string]float64        `json:"metrics"`
}

type ProcessBottleneck struct {
	ID       string   `json:"id"`
	Label    string   `json:"label"`
	Count    int      `json:"count"`
	AgeHours float64  `json:"ageHours"`
	Severity string   `json:"severity"`
	Reasons  []string `json:"reasons"`
}

// ITSMEvidencePackRequest generates one-click evidence for audit, CAB, PIR, or operations review.
type ITSMEvidencePackRequest struct {
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	Purpose    string `json:"purpose"`
	Format     string `json:"format"`
}

type ITSMEvidencePack struct {
	ID          string                 `json:"id"`
	EntityType  string                 `json:"entityType"`
	EntityID    string                 `json:"entityId"`
	Purpose     string                 `json:"purpose"`
	Format      string                 `json:"format"`
	GeneratedAt time.Time              `json:"generatedAt"`
	Checksum    string                 `json:"checksum"`
	Sections    []EvidencePackSection  `json:"sections"`
	Snapshot    map[string]interface{} `json:"snapshot"`
}

type EvidencePackSection struct {
	Title string        `json:"title"`
	Items []interface{} `json:"items"`
}

// SLAForecastRequest predicts risk posture from workload and record age.
type SLAForecastRequest struct {
	Priority              string     `json:"priority"`
	Status                string     `json:"status"`
	CreatedAt             *time.Time `json:"createdAt,omitempty"`
	SLAResponseTarget      *time.Time `json:"slaResponseTarget,omitempty"`
	SLAResolutionTarget    *time.Time `json:"slaResolutionTarget,omitempty"`
	QueueOpenCount         int        `json:"queueOpenCount"`
	AssigneeOpenCount      int        `json:"assigneeOpenCount"`
	SimilarHistoricalHours float64    `json:"similarHistoricalHours"`
}

type SLAForecastResponse struct {
	BreachProbability float64  `json:"breachProbability"`
	RiskLabel         string   `json:"riskLabel"`
	MinutesRemaining  int      `json:"minutesRemaining"`
	Drivers           []string `json:"drivers"`
	Recommendations   []string `json:"recommendations"`
}

// PlaybookPreviewRequest dry-runs automation actions for lifecycle transitions.
type PlaybookPreviewRequest struct {
	EntityType   string            `json:"entityType"`
	EntityID     string            `json:"entityId"`
	Transition   string            `json:"transition"`
	Priority     string            `json:"priority"`
	Metadata     map[string]string `json:"metadata"`
}

type PlaybookPreviewResponse struct {
	Actions []PlaybookActionPreview `json:"actions"`
	Warnings []string               `json:"warnings"`
}

type PlaybookActionPreview struct {
	Type        string `json:"type"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
}

// OperationsSnapshotResponse powers mobile approvals, waiting-on-me, saved workspaces,
// CI confidence review, and DR/NFR readiness cards.
type OperationsSnapshotResponse struct {
	WaitingOnMe       []OperationsTask       `json:"waitingOnMe"`
	MobileApprovals   []OperationsTask       `json:"mobileApprovals"`
	SavedWorkspaces    []SavedWorkspace       `json:"savedWorkspaces"`
	CIHealth           []CIHealthSignal       `json:"ciHealth"`
	DRReadiness        []ReadinessSignal      `json:"drReadiness"`
	PersonalPreference PersonalPreferenceHint `json:"personalPreference"`
}

type OperationsTask struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	DueAt     *time.Time `json:"dueAt,omitempty"`
	ActionURL string    `json:"actionUrl"`
	Reason    string    `json:"reason"`
}

type SavedWorkspace struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Filters     []string `json:"filters"`
}

type CIHealthSignal struct {
	ID         string    `json:"id"`
	Label      string    `json:"label"`
	CIType     string    `json:"ciType"`
	Confidence float64   `json:"confidence"`
	StaleSince *time.Time `json:"staleSince,omitempty"`
	Reason     string    `json:"reason"`
}

type ReadinessSignal struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Status   string `json:"status"`
	Evidence string `json:"evidence"`
}

type PersonalPreferenceHint struct {
	DefaultQueue string   `json:"defaultQueue"`
	Density      string   `json:"density"`
	SavedFilters []string `json:"savedFilters"`
}

type compactTicketRow struct {
	ID               uuid.UUID
	TicketNumber     string
	Title            string
	Status           string
	Priority         string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	SLAResolutionTarget *time.Time
}

package itsm

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/itd-cbn/itd-opms-api/internal/platform/workflow"
)

// ──────────────────────────────────────────────
// Ticket type constants
// ──────────────────────────────────────────────

const (
	TicketTypeIncident       = "incident"
	TicketTypeServiceRequest = "service_request"
	TicketTypeProblem        = "problem"
	TicketTypeChange         = "change"
)

// ──────────────────────────────────────────────
// Ticket priority constants
// ──────────────────────────────────────────────

const (
	TicketPriorityP1Critical = "P1_critical"
	TicketPriorityP2High     = "P2_high"
	TicketPriorityP3Medium   = "P3_medium"
	TicketPriorityP4Low      = "P4_low"
)

// ──────────────────────────────────────────────
// Ticket urgency constants
// ──────────────────────────────────────────────

const (
	TicketUrgencyCritical = "critical"
	TicketUrgencyHigh     = "high"
	TicketUrgencyMedium   = "medium"
	TicketUrgencyLow      = "low"
)

// ──────────────────────────────────────────────
// Ticket impact constants
// ──────────────────────────────────────────────

const (
	TicketImpactCritical = "critical"
	TicketImpactHigh     = "high"
	TicketImpactMedium   = "medium"
	TicketImpactLow      = "low"
)

// ──────────────────────────────────────────────
// Ticket status constants
// ──────────────────────────────────────────────

const (
	TicketStatusLogged          = "logged"
	TicketStatusClassified      = "classified"
	TicketStatusAssigned        = "assigned"
	TicketStatusInProgress      = "in_progress"
	TicketStatusPendingCustomer = "pending_customer"
	TicketStatusPendingVendor   = "pending_vendor"
	TicketStatusResolved        = "resolved"
	TicketStatusClosed          = "closed"
	TicketStatusCancelled       = "cancelled"
)

// ──────────────────────────────────────────────
// Ticket channel constants
// ──────────────────────────────────────────────

const (
	TicketChannelPortal = "portal"
	TicketChannelEmail  = "email"
	TicketChannelManual = "manual"
	TicketChannelAPI    = "api"
)

// ──────────────────────────────────────────────
// Catalog item status constants
// ──────────────────────────────────────────────

const (
	CatalogItemStatusActive     = "active"
	CatalogItemStatusInactive   = "inactive"
	CatalogItemStatusDeprecated = "deprecated"
)

// ──────────────────────────────────────────────
// Problem status constants
// ──────────────────────────────────────────────

const (
	ProblemStatusLogged              = "logged"
	ProblemStatusInvestigating       = "investigating"
	ProblemStatusRootCauseIdentified = "root_cause_identified"
	ProblemStatusKnownError          = "known_error"
	ProblemStatusThirdPartyEscalated = "third_party_escalated"
	ProblemStatusResolved            = "resolved"
	ProblemStatusClosed              = "closed"
)

// ──────────────────────────────────────────────
// Known error status constants
// ──────────────────────────────────────────────

const (
	KnownErrorStatusActive   = "active"
	KnownErrorStatusResolved = "resolved"
	KnownErrorStatusRetired  = "retired"
)

// ──────────────────────────────────────────────
// SLA breach type constants
// ──────────────────────────────────────────────

const (
	SLABreachTypeResponse   = "response"
	SLABreachTypeResolution = "resolution"
)

// ──────────────────────────────────────────────
// Escalation trigger type constants
// ──────────────────────────────────────────────

const (
	EscalationTriggerSLAWarning = "sla_warning"
	EscalationTriggerSLABreach  = "sla_breach"
	EscalationTriggerPriority   = "priority"
	EscalationTriggerManual     = "manual"
)

// ──────────────────────────────────────────────
// Auto-assign rule constants
// ──────────────────────────────────────────────

const (
	AutoAssignRuleRoundRobin  = "round_robin"
	AutoAssignRuleLeastLoaded = "least_loaded"
	AutoAssignRuleSkillsBased = "skills_based"
	AutoAssignRuleManual      = "manual"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// CatalogCategory represents a hierarchical category in the service catalog.
type CatalogCategory struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Icon        *string    `json:"icon"`
	ParentID    *uuid.UUID `json:"parentId"`
	SortOrder   int        `json:"sortOrder"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// CatalogItem represents a requestable service in the catalog.
type CatalogItem struct {
	ID                    uuid.UUID       `json:"id"`
	TenantID              uuid.UUID       `json:"tenantId"`
	CategoryID            *uuid.UUID      `json:"categoryId"`
	Name                  string          `json:"name"`
	Description           *string         `json:"description"`
	FulfillmentWorkflowID *uuid.UUID      `json:"fulfillmentWorkflowId"`
	ApprovalRequired      bool            `json:"approvalRequired"`
	ApprovalChainConfig   json.RawMessage `json:"approvalChainConfig"`
	SLAPolicyID           *uuid.UUID      `json:"slaPolicyId"`
	FormSchema            json.RawMessage `json:"formSchema"`
	EntitlementRoles      []string        `json:"entitlementRoles"`
	EstimatedDelivery     *string         `json:"estimatedDelivery"`
	Status                string          `json:"status"`
	Version               int             `json:"version"`
	CreatedAt             time.Time       `json:"createdAt"`
	UpdatedAt             time.Time       `json:"updatedAt"`
}

// Ticket represents an ITSM ticket (incident, service request, problem, or change).
type Ticket struct {
	ID                       uuid.UUID       `json:"id"`
	TenantID                 uuid.UUID       `json:"tenantId"`
	TicketNumber             string          `json:"ticketNumber"`
	Type                     string          `json:"type"`
	Category                 *string         `json:"category"`
	Subcategory              *string         `json:"subcategory"`
	Title                    string          `json:"title"`
	Description              string          `json:"description"`
	Priority                 string          `json:"priority"`
	Urgency                  string          `json:"urgency"`
	Impact                   string          `json:"impact"`
	Status                   string          `json:"status"`
	Channel                  string          `json:"channel"`
	ReporterID               uuid.UUID       `json:"reporterId"`
	ReporterEmail            *string         `json:"reporterEmail,omitempty"`
	EmailThreadID            *string         `json:"emailThreadId,omitempty"`
	EmailMessageIDs          []string        `json:"emailMessageIds,omitempty"`
	AssigneeID               *uuid.UUID      `json:"assigneeId"`
	TeamQueueID              *uuid.UUID      `json:"teamQueueId"`
	SLAPolicyID              *uuid.UUID      `json:"slaPolicyId"`
	SLAResponseTarget        *time.Time      `json:"slaResponseTarget"`
	SLAResolutionTarget      *time.Time      `json:"slaResolutionTarget"`
	SLAResponseMet           *bool           `json:"slaResponseMet"`
	SLAResolutionMet         *bool           `json:"slaResolutionMet"`
	SLAPausedAt              *time.Time      `json:"slaPausedAt"`
	SLAPausedDurationMinutes int             `json:"slaPausedDurationMinutes"`
	IsMajorIncident          bool            `json:"isMajorIncident"`
	RelatedTicketIDs         []uuid.UUID     `json:"relatedTicketIds"`
	LinkedProblemID          *uuid.UUID      `json:"linkedProblemId"`
	LinkedAssetIDs           []uuid.UUID     `json:"linkedAssetIds"`
	LinkedCIIDs              []uuid.UUID     `json:"linkedCiIds"`
	OrgUnitID                *uuid.UUID      `json:"orgUnitId"`
	ParentTicketID           *uuid.UUID      `json:"parentTicketId"`
	ResolutionNotes          *string         `json:"resolutionNotes"`
	ResolvedAt               *time.Time      `json:"resolvedAt"`
	ClosedAt                 *time.Time      `json:"closedAt"`
	FirstResponseAt          *time.Time      `json:"firstResponseAt"`
	SatisfactionScore        *int            `json:"satisfactionScore"`
	Tags                     []string        `json:"tags"`
	CustomFields             json.RawMessage `json:"customFields"`
	CreatedAt                time.Time       `json:"createdAt"`
	UpdatedAt                time.Time       `json:"updatedAt"`

	// Change-specific fields (populated only when type = "change").
	ChangeClassification *string         `json:"changeClassification,omitempty"`
	ChangeType           *string         `json:"changeType,omitempty"`
	RiskLevel            *string         `json:"riskLevel,omitempty"`
	RiskAssessment       json.RawMessage `json:"riskAssessment,omitempty"`
	ImplementationPlan   *string         `json:"implementationPlan,omitempty"`
	RollbackPlan         *string         `json:"rollbackPlan,omitempty"`
	TestPlan             *string         `json:"testPlan,omitempty"`
	ScheduledStart       *time.Time      `json:"scheduledStart,omitempty"`
	ScheduledEnd         *time.Time      `json:"scheduledEnd,omitempty"`
	ActualStart          *time.Time      `json:"actualStart,omitempty"`
	ActualEnd            *time.Time      `json:"actualEnd,omitempty"`
	CABRequired          bool            `json:"cabRequired"`
	CABMeetingID         *uuid.UUID      `json:"cabMeetingId,omitempty"`
	CABDecision          *string         `json:"cabDecision,omitempty"`
	CABDecisionDate      *time.Time      `json:"cabDecisionDate,omitempty"`
	PIRRequired          bool            `json:"pirRequired"`
	PIRCompleted         bool            `json:"pirCompleted"`
	PIRNotes             *string         `json:"pirNotes,omitempty"`
	CABNotes             *string         `json:"cabNotes,omitempty"`
	ChangeSuccess        *bool           `json:"changeSuccess,omitempty"`

	// Enrichment fields (populated via JOINs on SELECT queries, not on INSERT/UPDATE RETURNING).
	ReporterName          *string    `json:"reporterName,omitempty"`
	ReporterDepartment    *string    `json:"reporterDepartment,omitempty"`
	AssigneeName          *string    `json:"assigneeName,omitempty"`
	AssigneeDepartment    *string    `json:"assigneeDepartment,omitempty"`
	TeamQueueName         *string    `json:"teamQueueName,omitempty"`
	MajorIncidentRecordID *uuid.UUID `json:"majorIncidentRecordId,omitempty"`
	MajorIncidentStatus   *string    `json:"majorIncidentStatus,omitempty"`
	MajorIncidentSeverity *string    `json:"majorIncidentSeverity,omitempty"`
	SubtaskCount          *int       `json:"subtaskCount,omitempty"`
	ParentTicketNumber    *string    `json:"parentTicketNumber,omitempty"`
}

// TicketComment represents a comment or note on a ticket.
type TicketComment struct {
	ID          uuid.UUID   `json:"id"`
	TicketID    uuid.UUID   `json:"ticketId"`
	AuthorID    uuid.UUID   `json:"authorId"`
	Content     string      `json:"content"`
	IsInternal  bool        `json:"isInternal"`
	Attachments []uuid.UUID `json:"attachments"`
	CreatedAt   time.Time   `json:"createdAt"`
}

// TicketStatusHistory records a status transition for audit purposes.
type TicketStatusHistory struct {
	ID         uuid.UUID `json:"id"`
	TicketID   uuid.UUID `json:"ticketId"`
	FromStatus string    `json:"fromStatus"`
	ToStatus   string    `json:"toStatus"`
	ChangedBy  uuid.UUID `json:"changedBy"`
	Reason     *string   `json:"reason"`
	CreatedAt  time.Time `json:"createdAt"`
}

// EscalationRule defines automated escalation behavior.
type EscalationRule struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenantId"`
	Name            string          `json:"name"`
	TriggerType     string          `json:"triggerType"`
	TriggerConfig   json.RawMessage `json:"triggerConfig"`
	EscalationChain json.RawMessage `json:"escalationChain"`
	IsActive        bool            `json:"isActive"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// SLAPolicy defines response and resolution targets per priority.
type SLAPolicy struct {
	ID                      uuid.UUID       `json:"id"`
	TenantID                uuid.UUID       `json:"tenantId"`
	Name                    string          `json:"name"`
	Description             *string         `json:"description"`
	PriorityTargets         json.RawMessage `json:"priorityTargets"`
	BusinessHoursCalendarID *uuid.UUID      `json:"businessHoursCalendarId"`
	IsDefault               bool            `json:"isDefault"`
	IsActive                bool            `json:"isActive"`
	CreatedAt               time.Time       `json:"createdAt"`
	UpdatedAt               time.Time       `json:"updatedAt"`
}

// BusinessHoursCalendar defines working hours and holidays for SLA calculation.
type BusinessHoursCalendar struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenantId"`
	Name      string          `json:"name"`
	Timezone  string          `json:"timezone"`
	Schedule  json.RawMessage `json:"schedule"`
	Holidays  json.RawMessage `json:"holidays"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// SLABreachEntry records an SLA breach event for a ticket.
type SLABreachEntry struct {
	ID                    uuid.UUID `json:"id"`
	TicketID              uuid.UUID `json:"ticketId"`
	BreachType            string    `json:"breachType"`
	BreachedAt            time.Time `json:"breachedAt"`
	TargetWas             time.Time `json:"targetWas"`
	ActualDurationMinutes *int      `json:"actualDurationMinutes"`
	CreatedAt             time.Time `json:"createdAt"`
}

// Problem represents a root-cause investigation linked to incidents.
type Problem struct {
	ID                uuid.UUID       `json:"id"`
	TenantID          uuid.UUID       `json:"tenantId"`
	ProblemNumber     string          `json:"problemNumber"`
	Title             string          `json:"title"`
	Description       *string         `json:"description"`
	RootCause         *string         `json:"rootCause"`
	RCATemplateID     *uuid.UUID      `json:"rcaTemplateId"`
	RCAData           json.RawMessage `json:"rcaData"`
	Status            string          `json:"status"`
	LinkedIncidentIDs []uuid.UUID     `json:"linkedIncidentIds"`
	LinkedAssetIDs    []uuid.UUID     `json:"linkedAssetIds"`
	LinkedCIIDs       []uuid.UUID     `json:"linkedCiIds"`
	Workaround        *string         `json:"workaround"`
	PermanentFix      *string         `json:"permanentFix"`
	LinkedChangeID    *uuid.UUID      `json:"linkedChangeId"`
	OwnerID           *uuid.UUID      `json:"ownerId"`
	AssignedGroupID   *uuid.UUID      `json:"assignedGroupId"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`

	// Enrichment fields (populated via LEFT JOINs on SELECT queries).
	AssignedGroupName *string `json:"assignedGroupName,omitempty"`
	OwnerName         *string `json:"ownerName,omitempty"`
}

// ProblemRCATemplate describes a structured RCA method such as 5-Whys or Ishikawa.
type ProblemRCATemplate struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  *uuid.UUID      `json:"tenantId"`
	Name      string          `json:"name"`
	Method    string          `json:"method"`
	Schema    json.RawMessage `json:"schema"`
	IsActive  bool            `json:"isActive"`
	CreatedBy *uuid.UUID      `json:"createdBy"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// KnownError represents a documented known error with a workaround.
type KnownError struct {
	ID          uuid.UUID  `json:"id"`
	ProblemID   uuid.UUID  `json:"problemId"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Workaround  *string    `json:"workaround"`
	KBArticleID *uuid.UUID `json:"kbArticleId"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// SupportQueue represents a team-based queue for ticket routing.
type SupportQueue struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenantId"`
	Name           string     `json:"name"`
	TeamID         *uuid.UUID `json:"teamId"`
	PriorityFilter []string   `json:"priorityFilter"`
	AutoAssignRule string     `json:"autoAssignRule"`
	IsActive       bool       `json:"isActive"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// CSATSurvey represents a customer satisfaction survey response.
type CSATSurvey struct {
	ID           uuid.UUID `json:"id"`
	TicketID     uuid.UUID `json:"ticketId"`
	RespondentID uuid.UUID `json:"respondentId"`
	Rating       int       `json:"rating"`
	Comment      *string   `json:"comment"`
	CreatedAt    time.Time `json:"createdAt"`
}

// ──────────────────────────────────────────────
// Composite / summary types
// ──────────────────────────────────────────────

// TicketStats provides aggregate ticket statistics for a tenant dashboard.
type TicketStats struct {
	Total            int `json:"total"`
	OpenCount        int `json:"openCount"`
	SLABreachedCount int `json:"slaBreachedCount"`
	MajorIncidents   int `json:"majorIncidents"`
}

// SLAComplianceStats provides SLA compliance metrics.
type SLAComplianceStats struct {
	TotalTickets  int `json:"totalTickets"`
	ResponseMet   int `json:"responseMet"`
	ResolutionMet int `json:"resolutionMet"`
}

// ServiceRequestSLACompliance provides SLA compliance metrics for service requests.
type ServiceRequestSLACompliance struct {
	TotalRequests       int `json:"totalRequests"`
	WithSLA             int `json:"withSla"`
	ResolutionMet       int `json:"resolutionMet"`
	ResolutionBreached  int `json:"resolutionBreached"`
	FulfillmentMet      int `json:"fulfillmentMet"`
	FulfillmentBreached int `json:"fulfillmentBreached"`
	ActiveAtRisk        int `json:"activeAtRisk"`
}

// OperationalLevelAgreement (OLA) defines internal team agreements that support SLAs.
type OperationalLevelAgreement struct {
	ID                      uuid.UUID  `json:"id"`
	TenantID                uuid.UUID  `json:"tenantId"`
	Name                    string     `json:"name"`
	Description             *string    `json:"description"`
	SupportTeamID           *uuid.UUID `json:"supportTeamId"`
	ServiceCatalogItemID    *uuid.UUID `json:"serviceCatalogItemId"`
	ParentSLAID             *uuid.UUID `json:"parentSlaId"`
	ResponseTargetMinutes   int        `json:"responseTargetMinutes"`
	ResolutionTargetMinutes int        `json:"resolutionTargetMinutes"`
	BusinessHoursCalendarID *uuid.UUID `json:"businessHoursCalendarId"`
	EscalationContactID     *uuid.UUID `json:"escalationContactId"`
	Status                  string     `json:"status"`
	EffectiveFrom           *string    `json:"effectiveFrom"`
	EffectiveTo             *string    `json:"effectiveTo"`
	ReviewDate              *string    `json:"reviewDate"`
	CreatedBy               uuid.UUID  `json:"createdBy"`
	CreatedAt               time.Time  `json:"createdAt"`
	UpdatedAt               time.Time  `json:"updatedAt"`
	// Joined fields
	SupportTeamName       *string `json:"supportTeamName,omitempty"`
	ParentSLAName         *string `json:"parentSlaName,omitempty"`
	EscalationContactName *string `json:"escalationContactName,omitempty"`
}

// UnderpinningContract (UC) defines vendor contract terms that underpin SLAs.
type UnderpinningContract struct {
	ID                      uuid.UUID  `json:"id"`
	TenantID                uuid.UUID  `json:"tenantId"`
	Name                    string     `json:"name"`
	VendorID                *uuid.UUID `json:"vendorId"`
	ContractID              *uuid.UUID `json:"contractId"`
	ParentSLAID             *uuid.UUID `json:"parentSlaId"`
	ResponseTargetMinutes   int        `json:"responseTargetMinutes"`
	ResolutionTargetMinutes int        `json:"resolutionTargetMinutes"`
	PenaltyClause           *string    `json:"penaltyClause"`
	Status                  string     `json:"status"`
	EffectiveFrom           *string    `json:"effectiveFrom"`
	EffectiveTo             *string    `json:"effectiveTo"`
	ReviewDate              *string    `json:"reviewDate"`
	CreatedBy               uuid.UUID  `json:"createdBy"`
	CreatedAt               time.Time  `json:"createdAt"`
	UpdatedAt               time.Time  `json:"updatedAt"`
	// Joined fields
	VendorName    *string `json:"vendorName,omitempty"`
	ContractTitle *string `json:"contractTitle,omitempty"`
	ParentSLAName *string `json:"parentSlaName,omitempty"`
}

// SLADependencyChainEntry represents a link in the SLA → OLA → UC chain.
type SLADependencyChainEntry struct {
	ID          uuid.UUID  `json:"id"`
	SLAPolicyID uuid.UUID  `json:"slaPolicyId"`
	OLAID       *uuid.UUID `json:"olaId"`
	UCID        *uuid.UUID `json:"ucId"`
	Notes       *string    `json:"notes"`
	CreatedAt   time.Time  `json:"createdAt"`
	// Joined fields
	SLAName              *string `json:"slaName,omitempty"`
	OLAName              *string `json:"olaName,omitempty"`
	UCName               *string `json:"ucName,omitempty"`
	SLAResponseMinutes   *int    `json:"slaResponseMinutes,omitempty"`
	SLAResolutionMinutes *int    `json:"slaResolutionMinutes,omitempty"`
	OLAResponseMinutes   *int    `json:"olaResponseMinutes,omitempty"`
	OLAResolutionMinutes *int    `json:"olaResolutionMinutes,omitempty"`
	UCResponseMinutes    *int    `json:"ucResponseMinutes,omitempty"`
	UCResolutionMinutes  *int    `json:"ucResolutionMinutes,omitempty"`
}

// ConsistencyViolation represents an OLA/UC that exceeds its parent SLA target.
type ConsistencyViolation struct {
	Type                string `json:"type"` // "ola" or "uc"
	EntityID            string `json:"entityId"`
	EntityName          string `json:"entityName"`
	ParentSLAID         string `json:"parentSlaId"`
	ParentSLAName       string `json:"parentSlaName"`
	Field               string `json:"field"` // "response" or "resolution"
	SLATargetMinutes    int    `json:"slaTargetMinutes"`
	EntityTargetMinutes int    `json:"entityTargetMinutes"`
}

// CSATStats provides aggregate customer satisfaction metrics.
type CSATStats struct {
	Total     int     `json:"total"`
	AvgRating float64 `json:"avgRating"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateCatalogCategoryRequest is the payload for creating a service catalog category.
type CreateCatalogCategoryRequest struct {
	Name        string     `json:"name" validate:"required"`
	Description *string    `json:"description"`
	Icon        *string    `json:"icon"`
	ParentID    *uuid.UUID `json:"parentId"`
	SortOrder   *int       `json:"sortOrder"`
}

// UpdateCatalogCategoryRequest is the payload for updating a service catalog category.
type UpdateCatalogCategoryRequest struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	Icon        *string    `json:"icon"`
	ParentID    *uuid.UUID `json:"parentId"`
	SortOrder   *int       `json:"sortOrder"`
}

// CreateCatalogItemRequest is the payload for creating a service catalog item.
type CreateCatalogItemRequest struct {
	CategoryID            *uuid.UUID      `json:"categoryId"`
	Name                  string          `json:"name" validate:"required"`
	Description           *string         `json:"description"`
	FulfillmentWorkflowID *uuid.UUID      `json:"fulfillmentWorkflowId"`
	ApprovalRequired      *bool           `json:"approvalRequired"`
	ApprovalChainConfig   json.RawMessage `json:"approvalChainConfig"`
	SLAPolicyID           *uuid.UUID      `json:"slaPolicyId"`
	FormSchema            json.RawMessage `json:"formSchema"`
	EntitlementRoles      []string        `json:"entitlementRoles"`
	EstimatedDelivery     *string         `json:"estimatedDelivery"`
	Status                *string         `json:"status"`
}

// BulkUpdateItemStatusRequest is the payload for bulk-updating catalog item statuses.
type BulkUpdateItemStatusRequest struct {
	IDs    []uuid.UUID `json:"ids" validate:"required"`
	Status string      `json:"status" validate:"required"`
}

// UpdateCatalogItemRequest is the payload for updating a service catalog item.
type UpdateCatalogItemRequest struct {
	CategoryID            *uuid.UUID      `json:"categoryId"`
	Name                  *string         `json:"name"`
	Description           *string         `json:"description"`
	FulfillmentWorkflowID *uuid.UUID      `json:"fulfillmentWorkflowId"`
	ApprovalRequired      *bool           `json:"approvalRequired"`
	ApprovalChainConfig   json.RawMessage `json:"approvalChainConfig"`
	SLAPolicyID           *uuid.UUID      `json:"slaPolicyId"`
	FormSchema            json.RawMessage `json:"formSchema"`
	EntitlementRoles      []string        `json:"entitlementRoles"`
	EstimatedDelivery     *string         `json:"estimatedDelivery"`
	Status                *string         `json:"status"`
	Version               *int            `json:"version"`
}

// CreateTicketRequest is the payload for creating a new ITSM ticket.
type CreateTicketRequest struct {
	Type           string          `json:"type" validate:"required"`
	Category       *string         `json:"category"`
	Subcategory    *string         `json:"subcategory"`
	Title          string          `json:"title" validate:"required"`
	Description    string          `json:"description" validate:"required"`
	Priority       *string         `json:"priority"`
	Urgency        string          `json:"urgency" validate:"required"`
	Impact         string          `json:"impact" validate:"required"`
	Channel        *string         `json:"channel"`
	AssigneeID     *uuid.UUID      `json:"assigneeId"`
	TeamQueueID    *uuid.UUID      `json:"teamQueueId"`
	SLAPolicyID    *uuid.UUID      `json:"slaPolicyId"`
	LinkedAssetIDs []uuid.UUID     `json:"linkedAssetIds"`
	LinkedCIIDs    []uuid.UUID     `json:"linkedCiIds"`
	Tags           []string        `json:"tags"`
	CustomFields   json.RawMessage `json:"customFields"`
	ParentTicketID *uuid.UUID      `json:"parentTicketId,omitempty"` // set internally for subtask creation
}

// SubtaskSummary is a compact representation of a child ticket.
type SubtaskSummary struct {
	ID           uuid.UUID  `json:"id"`
	TicketNumber string     `json:"ticketNumber"`
	Title        string     `json:"title"`
	Type         string     `json:"type"`
	Status       string     `json:"status"`
	Priority     string     `json:"priority"`
	AssigneeID   *uuid.UUID `json:"assigneeId"`
	AssigneeName *string    `json:"assigneeName,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
}

// SubtaskProgress tracks completion stats for a parent ticket's children.
type SubtaskProgress struct {
	Total     int `json:"total"`
	Completed int `json:"completed"`
	Cancelled int `json:"cancelled"`
}

// SubtasksResponse is returned by GET /{id}/subtasks.
type SubtasksResponse struct {
	Subtasks []SubtaskSummary `json:"subtasks"`
	Progress SubtaskProgress  `json:"progress"`
}

// CreateSubtaskRequest is the payload for creating a subtask under a parent.
type CreateSubtaskRequest struct {
	Title       string     `json:"title" validate:"required"`
	Description string     `json:"description" validate:"required"`
	Priority    *string    `json:"priority"`
	AssigneeID  *uuid.UUID `json:"assigneeId"`
}

// UpdateTicketRequest is the payload for updating ticket metadata.
type UpdateTicketRequest struct {
	Category       *string         `json:"category"`
	Subcategory    *string         `json:"subcategory"`
	Title          *string         `json:"title"`
	Description    *string         `json:"description"`
	Priority       *string         `json:"priority"`
	LinkedAssetIDs []uuid.UUID     `json:"linkedAssetIds"`
	LinkedCIIDs    []uuid.UUID     `json:"linkedCiIds"`
	Tags           []string        `json:"tags"`
	CustomFields   json.RawMessage `json:"customFields"`
}

// TransitionTicketRequest is the payload for changing ticket status.
type TransitionTicketRequest struct {
	Status string  `json:"status" validate:"required"`
	Reason *string `json:"reason"`
}

// AssignTicketRequest is the payload for assigning a ticket.
type AssignTicketRequest struct {
	AssigneeID  *uuid.UUID `json:"assigneeId"`
	TeamQueueID *uuid.UUID `json:"teamQueueId"`
}

// PauseSLARequest is the payload for manually pausing a ticket's SLA clock.
type PauseSLARequest struct {
	Reason string `json:"reason"`
}

// ResumeSLARequest is the payload for manually resuming a ticket's SLA clock.
type ResumeSLARequest struct {
	Notes string `json:"notes"`
}

// AddCommentRequest is the payload for adding a comment to a ticket.
type AddCommentRequest struct {
	Content    string `json:"content" validate:"required"`
	IsInternal *bool  `json:"isInternal"`
}

// LinkTicketsRequest is the payload for linking two tickets.
type LinkTicketsRequest struct {
	RelatedTicketID uuid.UUID `json:"relatedTicketId" validate:"required"`
}

// LinkTicketConfigurationRequest links or replaces related assets/CIs for a ticket.
type LinkTicketConfigurationRequest struct {
	AssetIDs []uuid.UUID `json:"assetIds"`
	CIIDs    []uuid.UUID `json:"ciIds"`
	Replace  bool        `json:"replace"`
}

// ResolveTicketRequest is the payload for resolving a ticket.
type ResolveTicketRequest struct {
	ResolutionNotes string `json:"resolutionNotes" validate:"required"`
}

// DeclareMajorIncidentRequest is the payload for declaring a major incident.
type DeclareMajorIncidentRequest struct {
	CommunicationPlan *string `json:"communicationPlan"`
}

// ──────────────────────────────────────────────
// Ticket ↔ KB Article Links
// ──────────────────────────────────────────────

// TicketKBLink represents a link between a ticket and a KB article.
type TicketKBLink struct {
	ID            uuid.UUID `json:"id"`
	TicketID      uuid.UUID `json:"ticketId"`
	ArticleID     uuid.UUID `json:"articleId"`
	LinkedBy      uuid.UUID `json:"linkedBy"`
	LinkType      string    `json:"linkType"`
	CreatedAt     time.Time `json:"createdAt"`
	ArticleTitle  string    `json:"articleTitle"`
	ArticleSlug   string    `json:"articleSlug"`
	ArticleStatus string    `json:"articleStatus"`
	ArticleType   string    `json:"articleType"`
	LinkedByName  string    `json:"linkedByName"`
}

// LinkArticleRequest is the payload for linking an article to a ticket.
type LinkArticleRequest struct {
	ArticleID uuid.UUID `json:"articleId" validate:"required"`
	LinkType  string    `json:"linkType"` // reference, resolution, workaround
}

// KBSuggestion is a lightweight KB article returned from auto-suggest.
type KBSuggestion struct {
	ID           uuid.UUID `json:"id"`
	Title        string    `json:"title"`
	Slug         string    `json:"slug"`
	Type         string    `json:"type"`
	Status       string    `json:"status"`
	ViewCount    int       `json:"viewCount"`
	HelpfulCount int       `json:"helpfulCount"`
	Rank         float64   `json:"rank"`
}

// CreateSLAPolicyRequest is the payload for creating an SLA policy.
type CreateSLAPolicyRequest struct {
	Name                    string          `json:"name" validate:"required"`
	Description             *string         `json:"description"`
	PriorityTargets         json.RawMessage `json:"priorityTargets" validate:"required"`
	BusinessHoursCalendarID *uuid.UUID      `json:"businessHoursCalendarId"`
	IsDefault               *bool           `json:"isDefault"`
	IsActive                *bool           `json:"isActive"`
}

// UpdateSLAPolicyRequest is the payload for updating an SLA policy.
type UpdateSLAPolicyRequest struct {
	Name                    *string         `json:"name"`
	Description             *string         `json:"description"`
	PriorityTargets         json.RawMessage `json:"priorityTargets"`
	BusinessHoursCalendarID *uuid.UUID      `json:"businessHoursCalendarId"`
	IsDefault               *bool           `json:"isDefault"`
	IsActive                *bool           `json:"isActive"`
}

// CreateBusinessHoursCalendarRequest is the payload for creating a business hours calendar.
type CreateBusinessHoursCalendarRequest struct {
	Name     string          `json:"name" validate:"required"`
	Timezone string          `json:"timezone" validate:"required"`
	Schedule json.RawMessage `json:"schedule" validate:"required"`
	Holidays json.RawMessage `json:"holidays"`
}

// UpdateBusinessHoursCalendarRequest is the payload for updating a business hours calendar.
type UpdateBusinessHoursCalendarRequest struct {
	Name     *string         `json:"name"`
	Timezone *string         `json:"timezone"`
	Schedule json.RawMessage `json:"schedule"`
	Holidays json.RawMessage `json:"holidays"`
}

// CreateEscalationRuleRequest is the payload for creating an escalation rule.
type CreateEscalationRuleRequest struct {
	Name            string          `json:"name" validate:"required"`
	TriggerType     string          `json:"triggerType" validate:"required"`
	TriggerConfig   json.RawMessage `json:"triggerConfig"`
	EscalationChain json.RawMessage `json:"escalationChain"`
	IsActive        *bool           `json:"isActive"`
}

// UpdateEscalationRuleRequest is the payload for updating an escalation rule.
type UpdateEscalationRuleRequest struct {
	Name            *string         `json:"name"`
	TriggerType     *string         `json:"triggerType"`
	TriggerConfig   json.RawMessage `json:"triggerConfig"`
	EscalationChain json.RawMessage `json:"escalationChain"`
	IsActive        *bool           `json:"isActive"`
}

// CreateOLARequest is the payload for creating an Operational Level Agreement.
type CreateOLARequest struct {
	Name                    string     `json:"name" validate:"required"`
	Description             *string    `json:"description"`
	SupportTeamID           *uuid.UUID `json:"supportTeamId"`
	ServiceCatalogItemID    *uuid.UUID `json:"serviceCatalogItemId"`
	ParentSLAID             *uuid.UUID `json:"parentSlaId"`
	ResponseTargetMinutes   int        `json:"responseTargetMinutes" validate:"required"`
	ResolutionTargetMinutes int        `json:"resolutionTargetMinutes" validate:"required"`
	BusinessHoursCalendarID *uuid.UUID `json:"businessHoursCalendarId"`
	EscalationContactID     *uuid.UUID `json:"escalationContactId"`
	Status                  *string    `json:"status"`
	EffectiveFrom           *string    `json:"effectiveFrom"`
	EffectiveTo             *string    `json:"effectiveTo"`
	ReviewDate              *string    `json:"reviewDate"`
}

// UpdateOLARequest is the payload for updating an OLA.
type UpdateOLARequest struct {
	Name                    *string    `json:"name"`
	Description             *string    `json:"description"`
	SupportTeamID           *uuid.UUID `json:"supportTeamId"`
	ServiceCatalogItemID    *uuid.UUID `json:"serviceCatalogItemId"`
	ParentSLAID             *uuid.UUID `json:"parentSlaId"`
	ResponseTargetMinutes   *int       `json:"responseTargetMinutes"`
	ResolutionTargetMinutes *int       `json:"resolutionTargetMinutes"`
	BusinessHoursCalendarID *uuid.UUID `json:"businessHoursCalendarId"`
	EscalationContactID     *uuid.UUID `json:"escalationContactId"`
	Status                  *string    `json:"status"`
	EffectiveFrom           *string    `json:"effectiveFrom"`
	EffectiveTo             *string    `json:"effectiveTo"`
	ReviewDate              *string    `json:"reviewDate"`
}

// CreateUCRequest is the payload for creating an Underpinning Contract.
type CreateUCRequest struct {
	Name                    string     `json:"name" validate:"required"`
	VendorID                *uuid.UUID `json:"vendorId"`
	ContractID              *uuid.UUID `json:"contractId"`
	ParentSLAID             *uuid.UUID `json:"parentSlaId"`
	ResponseTargetMinutes   int        `json:"responseTargetMinutes" validate:"required"`
	ResolutionTargetMinutes int        `json:"resolutionTargetMinutes" validate:"required"`
	PenaltyClause           *string    `json:"penaltyClause"`
	Status                  *string    `json:"status"`
	EffectiveFrom           *string    `json:"effectiveFrom"`
	EffectiveTo             *string    `json:"effectiveTo"`
	ReviewDate              *string    `json:"reviewDate"`
}

// UpdateUCRequest is the payload for updating an Underpinning Contract.
type UpdateUCRequest struct {
	Name                    *string    `json:"name"`
	VendorID                *uuid.UUID `json:"vendorId"`
	ContractID              *uuid.UUID `json:"contractId"`
	ParentSLAID             *uuid.UUID `json:"parentSlaId"`
	ResponseTargetMinutes   *int       `json:"responseTargetMinutes"`
	ResolutionTargetMinutes *int       `json:"resolutionTargetMinutes"`
	PenaltyClause           *string    `json:"penaltyClause"`
	Status                  *string    `json:"status"`
	EffectiveFrom           *string    `json:"effectiveFrom"`
	EffectiveTo             *string    `json:"effectiveTo"`
	ReviewDate              *string    `json:"reviewDate"`
}

// CreateDependencyChainRequest links an SLA to an OLA and/or UC.
type CreateDependencyChainRequest struct {
	SLAPolicyID uuid.UUID  `json:"slaPolicyId" validate:"required"`
	OLAID       *uuid.UUID `json:"olaId"`
	UCID        *uuid.UUID `json:"ucId"`
	Notes       *string    `json:"notes"`
}

// CreateProblemRequest is the payload for creating a problem record.
type CreateProblemRequest struct {
	Title           string          `json:"title" validate:"required"`
	Description     *string         `json:"description"`
	Status          string          `json:"status"`
	RCATemplateID   *uuid.UUID      `json:"rcaTemplateId"`
	RCAData         json.RawMessage `json:"rcaData"`
	LinkedAssetIDs  []uuid.UUID     `json:"linkedAssetIds"`
	LinkedCIIDs     []uuid.UUID     `json:"linkedCiIds"`
	OwnerID         *uuid.UUID      `json:"ownerId"`
	AssignedGroupID *uuid.UUID      `json:"assignedGroupId"`
}

// UpdateProblemRequest is the payload for updating a problem record.
type UpdateProblemRequest struct {
	Title           *string         `json:"title"`
	Description     *string         `json:"description"`
	RootCause       *string         `json:"rootCause"`
	RCATemplateID   *uuid.UUID      `json:"rcaTemplateId"`
	RCAData         json.RawMessage `json:"rcaData"`
	LinkedAssetIDs  []uuid.UUID     `json:"linkedAssetIds"`
	LinkedCIIDs     []uuid.UUID     `json:"linkedCiIds"`
	Status          *string         `json:"status"`
	Workaround      *string         `json:"workaround"`
	PermanentFix    *string         `json:"permanentFix"`
	LinkedChangeID  *uuid.UUID      `json:"linkedChangeId"`
	OwnerID         *uuid.UUID      `json:"ownerId"`
	AssignedGroupID *uuid.UUID      `json:"assignedGroupId"`
}

// TransitionProblemRequest is the payload for changing problem status.
type TransitionProblemRequest struct {
	TargetStatus string  `json:"targetStatus" validate:"required"`
	Comment      *string `json:"comment"`
}

// LinkIncidentToProblemRequest is the payload for linking an incident to a problem.
type LinkIncidentToProblemRequest struct {
	IncidentID uuid.UUID `json:"incidentId" validate:"required"`
}

// LinkProblemConfigurationRequest links assets/CIs to a problem.
type LinkProblemConfigurationRequest struct {
	AssetIDs []uuid.UUID `json:"assetIds"`
	CIIDs    []uuid.UUID `json:"ciIds"`
	Replace  bool        `json:"replace"`
}

// CreateKnownErrorRequest is the payload for creating a known error.
type CreateKnownErrorRequest struct {
	ProblemID   uuid.UUID  `json:"problemId" validate:"required"`
	Title       string     `json:"title" validate:"required"`
	Description *string    `json:"description"`
	Workaround  *string    `json:"workaround"`
	KBArticleID *uuid.UUID `json:"kbArticleId"`
}

// UpdateKnownErrorRequest is the payload for updating a known error.
type UpdateKnownErrorRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Workaround  *string    `json:"workaround"`
	KBArticleID *uuid.UUID `json:"kbArticleId"`
	Status      *string    `json:"status"`
}

// CreateSupportQueueRequest is the payload for creating a support queue.
type CreateSupportQueueRequest struct {
	Name           string     `json:"name" validate:"required"`
	TeamID         *uuid.UUID `json:"teamId"`
	PriorityFilter []string   `json:"priorityFilter"`
	AutoAssignRule *string    `json:"autoAssignRule"`
}

// UpdateSupportQueueRequest is the payload for updating a support queue.
type UpdateSupportQueueRequest struct {
	Name           *string    `json:"name"`
	TeamID         *uuid.UUID `json:"teamId"`
	PriorityFilter []string   `json:"priorityFilter"`
	AutoAssignRule *string    `json:"autoAssignRule"`
	IsActive       *bool      `json:"isActive"`
}

// CreateCSATSurveyRequest is the payload for submitting a CSAT survey response.
type CreateCSATSurveyRequest struct {
	TicketID uuid.UUID `json:"ticketId" validate:"required"`
	Rating   int       `json:"rating" validate:"required"`
	Comment  *string   `json:"comment"`
}

// ──────────────────────────────────────────────
// Priority matrix
// ──────────────────────────────────────────────

// CalculatePriority returns the ticket priority based on the urgency x impact matrix.
func CalculatePriority(urgency, impact string) string {
	matrix := map[string]map[string]string{
		"critical": {
			"critical": TicketPriorityP1Critical,
			"high":     TicketPriorityP1Critical,
			"medium":   TicketPriorityP2High,
			"low":      TicketPriorityP3Medium,
		},
		"high": {
			"critical": TicketPriorityP1Critical,
			"high":     TicketPriorityP2High,
			"medium":   TicketPriorityP3Medium,
			"low":      TicketPriorityP3Medium,
		},
		"medium": {
			"critical": TicketPriorityP2High,
			"high":     TicketPriorityP3Medium,
			"medium":   TicketPriorityP3Medium,
			"low":      TicketPriorityP3Medium,
		},
		"low": {
			"critical": TicketPriorityP3Medium,
			"high":     TicketPriorityP3Medium,
			"medium":   TicketPriorityP3Medium,
			"low":      TicketPriorityP4Low,
		},
	}

	if row, ok := matrix[urgency]; ok {
		if priority, ok := row[impact]; ok {
			return priority
		}
	}
	return TicketPriorityP3Medium
}

// ──────────────────────────────────────────────
// Ticket status transition map
// ──────────────────────────────────────────────

// validTicketTransitions is retained for legacy tests and callers, but is
// derived from the platform workflow state machine so there is one source of truth.
var validTicketTransitions = workflow.TicketStateMachine.Transitions()

// IsValidTicketTransition checks whether a status transition from -> to is allowed.
func IsValidTicketTransition(from, to string) bool {
	return workflow.TicketStateMachine.IsValid(from, to)
}

// Problem, change, service request, and major incident transitions are enforced
// via the state machines in internal/platform/workflow.

// ──────────────────────────────────────────────
// Change classification constants
// ──────────────────────────────────────────────

const (
	ChangeClassificationEmergency = "emergency"
	ChangeClassificationStandard  = "standard"
	ChangeClassificationNormal    = "normal"
)

// ──────────────────────────────────────────────
// Change type constants
// ──────────────────────────────────────────────

const (
	ChangeTypeApplication    = "application"
	ChangeTypeInfrastructure = "infrastructure"
	ChangeTypeNetwork        = "network"
	ChangeTypeSecurity       = "security"
)

// ──────────────────────────────────────────────
// Risk level constants
// ──────────────────────────────────────────────

const (
	RiskLevelLow      = "low"
	RiskLevelMedium   = "medium"
	RiskLevelHigh     = "high"
	RiskLevelCritical = "critical"
)

// ──────────────────────────────────────────────
// CAB decision constants
// ──────────────────────────────────────────────

const (
	CABDecisionApproved              = "approved"
	CABDecisionRejected              = "rejected"
	CABDecisionDeferred              = "deferred"
	CABDecisionConditionallyApproved = "conditionally_approved"
)

// ──────────────────────────────────────────────
// Change domain types
// ──────────────────────────────────────────────

// CABMeeting represents a Change Advisory Board meeting.
type CABMeeting struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenantId"`
	Title           string          `json:"title"`
	Description     *string         `json:"description"`
	ScheduledDate   time.Time       `json:"scheduledDate"`
	Status          string          `json:"status"`
	ChairID         *uuid.UUID      `json:"chairId"`
	Attendees       []uuid.UUID     `json:"attendees"`
	Minutes         *string         `json:"minutes"`
	Decisions       json.RawMessage `json:"decisions"`
	DurationMinutes *int            `json:"durationMinutes,omitempty"`
	Location        *string         `json:"location,omitempty"`
	MeetingType     string          `json:"meetingType"`
	SecretaryUserID *uuid.UUID      `json:"secretaryUserId,omitempty"`
	Agenda          json.RawMessage `json:"agenda"`
	ChangeTicketIDs []uuid.UUID     `json:"changeTicketIds"`
	CreatedBy       uuid.UUID       `json:"createdBy"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// ChangeFreezeCheck represents the result of a freeze period check.
type ChangeFreezeCheck struct {
	IsFrozen   bool       `json:"isFrozen"`
	FreezeName *string    `json:"freezeName,omitempty"`
	FreezeEnd  *time.Time `json:"freezeEnd,omitempty"`
}

// ChangeStats provides aggregate change statistics.
type ChangeStats struct {
	Total        int `json:"total"`
	Emergency    int `json:"emergency"`
	Standard     int `json:"standard"`
	Normal       int `json:"normal"`
	PendingCAB   int `json:"pendingCab"`
	Implementing int `json:"implementing"`
	PendingPIR   int `json:"pendingPir"`
}

// ChangeCalendarEvent represents a change or freeze period on the calendar.
type ChangeCalendarEvent struct {
	ID             uuid.UUID `json:"id"`
	Title          string    `json:"title"`
	EventType      string    `json:"eventType"` // "change", "freeze", "maintenance"
	Classification *string   `json:"classification,omitempty"`
	RiskLevel      *string   `json:"riskLevel,omitempty"`
	Status         string    `json:"status"`
	StartTime      time.Time `json:"startTime"`
	EndTime        time.Time `json:"endTime"`
}

// ──────────────────────────────────────────────
// Change request types
// ──────────────────────────────────────────────

// CreateChangeRequest is the payload for creating a change ticket.
type CreateChangeRequest struct {
	Title              string          `json:"title" validate:"required"`
	Description        string          `json:"description" validate:"required"`
	Classification     string          `json:"classification" validate:"required"`
	ChangeType         string          `json:"changeType" validate:"required"`
	Urgency            string          `json:"urgency" validate:"required"`
	Impact             string          `json:"impact" validate:"required"`
	RiskLevel          *string         `json:"riskLevel"`
	RiskAssessment     json.RawMessage `json:"riskAssessment"`
	ImplementationPlan *string         `json:"implementationPlan"`
	RollbackPlan       *string         `json:"rollbackPlan"`
	TestPlan           *string         `json:"testPlan"`
	ScheduledStart     *time.Time      `json:"scheduledStart"`
	ScheduledEnd       *time.Time      `json:"scheduledEnd"`
	AssigneeID         *uuid.UUID      `json:"assigneeId"`
	TeamQueueID        *uuid.UUID      `json:"teamQueueId"`
	Category           *string         `json:"category"`
	Tags               []string        `json:"tags"`
}

// UpdateChangeRequest is the payload for updating change-specific fields.
type UpdateChangeRequest struct {
	Title              *string         `json:"title"`
	Description        *string         `json:"description"`
	ChangeType         *string         `json:"changeType"`
	RiskLevel          *string         `json:"riskLevel"`
	RiskAssessment     json.RawMessage `json:"riskAssessment"`
	ImplementationPlan *string         `json:"implementationPlan"`
	RollbackPlan       *string         `json:"rollbackPlan"`
	TestPlan           *string         `json:"testPlan"`
	ScheduledStart     *time.Time      `json:"scheduledStart"`
	ScheduledEnd       *time.Time      `json:"scheduledEnd"`
	AssigneeID         *uuid.UUID      `json:"assigneeId"`
	Category           *string         `json:"category"`
	Tags               []string        `json:"tags"`
}

// TransitionChangeRequest is the payload for changing a change ticket's status.
type TransitionChangeRequest struct {
	TargetStatus string  `json:"targetStatus" validate:"required"`
	Comment      *string `json:"comment"`
}

// SubmitCABDecisionRequest is the payload for recording a CAB decision on a change.
type SubmitCABDecisionRequest struct {
	Decision string  `json:"decision" validate:"required"`
	Notes    *string `json:"notes"`
}

// CompletePIRRequest is the payload for completing a post-implementation review.
type CompletePIRRequest struct {
	PIRNotes string `json:"pirNotes" validate:"required"`
}

// SubmitRiskAssessmentRequest is the payload for submitting a risk assessment on a change.
type SubmitRiskAssessmentRequest struct {
	RiskAssessment json.RawMessage `json:"riskAssessment" validate:"required"`
	RiskLevel      *string         `json:"riskLevel,omitempty"`
}

// ImplementChangeRequest is the payload for starting change implementation.
type ImplementChangeRequest struct {
	Comment *string `json:"comment,omitempty"`
}

// CompleteChangeRequest is the payload for marking a change as complete.
type CompleteChangeRequest struct {
	Success bool    `json:"success"`
	Notes   *string `json:"notes,omitempty"`
}

// RollbackChangeRequest is the payload for triggering a change rollback.
type RollbackChangeRequest struct {
	Reason string `json:"reason" validate:"required"`
}

// CreateCABMeetingRequest is the payload for creating a CAB meeting.
type CreateCABMeetingRequest struct {
	Title           string          `json:"title" validate:"required"`
	Description     *string         `json:"description"`
	ScheduledDate   time.Time       `json:"scheduledDate" validate:"required"`
	ChairID         *uuid.UUID      `json:"chairId"`
	Attendees       []uuid.UUID     `json:"attendees"`
	DurationMinutes *int            `json:"durationMinutes"`
	Location        *string         `json:"location"`
	MeetingType     *string         `json:"meetingType"`
	SecretaryUserID *uuid.UUID      `json:"secretaryUserId"`
	Agenda          json.RawMessage `json:"agenda"`
	ChangeTicketIDs []uuid.UUID     `json:"changeTicketIds"`
}

// UpdateCABMeetingRequest is the payload for updating a CAB meeting.
type UpdateCABMeetingRequest struct {
	Title           *string         `json:"title"`
	Description     *string         `json:"description"`
	ScheduledDate   *time.Time      `json:"scheduledDate"`
	ChairID         *uuid.UUID      `json:"chairId"`
	Attendees       []uuid.UUID     `json:"attendees"`
	Minutes         *string         `json:"minutes"`
	Status          *string         `json:"status"`
	DurationMinutes *int            `json:"durationMinutes"`
	Location        *string         `json:"location"`
	MeetingType     *string         `json:"meetingType"`
	SecretaryUserID *uuid.UUID      `json:"secretaryUserId"`
	Agenda          json.RawMessage `json:"agenda"`
	ChangeTicketIDs []uuid.UUID     `json:"changeTicketIds"`
}

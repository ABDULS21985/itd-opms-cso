package itsm

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
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
	ProblemStatusResolved            = "resolved"
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
	ID                     uuid.UUID       `json:"id"`
	TenantID               uuid.UUID       `json:"tenantId"`
	CategoryID             *uuid.UUID      `json:"categoryId"`
	Name                   string          `json:"name"`
	Description            *string         `json:"description"`
	FulfillmentWorkflowID  *uuid.UUID      `json:"fulfillmentWorkflowId"`
	ApprovalRequired       bool            `json:"approvalRequired"`
	ApprovalChainConfig    json.RawMessage `json:"approvalChainConfig"`
	SLAPolicyID            *uuid.UUID      `json:"slaPolicyId"`
	FormSchema             json.RawMessage `json:"formSchema"`
	EntitlementRoles       []string        `json:"entitlementRoles"`
	EstimatedDelivery      *string         `json:"estimatedDelivery"`
	Status                 string          `json:"status"`
	Version                int             `json:"version"`
	CreatedAt              time.Time       `json:"createdAt"`
	UpdatedAt              time.Time       `json:"updatedAt"`
}

// Ticket represents an ITSM ticket (incident, service request, problem, or change).
type Ticket struct {
	ID                      uuid.UUID       `json:"id"`
	TenantID                uuid.UUID       `json:"tenantId"`
	TicketNumber            string          `json:"ticketNumber"`
	Type                    string          `json:"type"`
	Category                *string         `json:"category"`
	Subcategory             *string         `json:"subcategory"`
	Title                   string          `json:"title"`
	Description             string          `json:"description"`
	Priority                string          `json:"priority"`
	Urgency                 string          `json:"urgency"`
	Impact                  string          `json:"impact"`
	Status                  string          `json:"status"`
	Channel                 string          `json:"channel"`
	ReporterID              uuid.UUID       `json:"reporterId"`
	AssigneeID              *uuid.UUID      `json:"assigneeId"`
	TeamQueueID             *uuid.UUID      `json:"teamQueueId"`
	SLAPolicyID             *uuid.UUID      `json:"slaPolicyId"`
	SLAResponseTarget       *time.Time      `json:"slaResponseTarget"`
	SLAResolutionTarget     *time.Time      `json:"slaResolutionTarget"`
	SLAResponseMet          *bool           `json:"slaResponseMet"`
	SLAResolutionMet        *bool           `json:"slaResolutionMet"`
	SLAPausedAt             *time.Time      `json:"slaPausedAt"`
	SLAPausedDurationMinutes int            `json:"slaPausedDurationMinutes"`
	IsMajorIncident         bool            `json:"isMajorIncident"`
	RelatedTicketIDs        []uuid.UUID     `json:"relatedTicketIds"`
	LinkedProblemID         *uuid.UUID      `json:"linkedProblemId"`
	LinkedAssetIDs          []uuid.UUID     `json:"linkedAssetIds"`
	ResolutionNotes         *string         `json:"resolutionNotes"`
	ResolvedAt              *time.Time      `json:"resolvedAt"`
	ClosedAt                *time.Time      `json:"closedAt"`
	FirstResponseAt         *time.Time      `json:"firstResponseAt"`
	SatisfactionScore       *int            `json:"satisfactionScore"`
	Tags                    []string        `json:"tags"`
	CustomFields            json.RawMessage `json:"customFields"`
	CreatedAt               time.Time       `json:"createdAt"`
	UpdatedAt               time.Time       `json:"updatedAt"`
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
	ID                uuid.UUID   `json:"id"`
	TenantID          uuid.UUID   `json:"tenantId"`
	ProblemNumber     string      `json:"problemNumber"`
	Title             string      `json:"title"`
	Description       *string     `json:"description"`
	RootCause         *string     `json:"rootCause"`
	Status            string      `json:"status"`
	LinkedIncidentIDs []uuid.UUID `json:"linkedIncidentIds"`
	Workaround        *string     `json:"workaround"`
	PermanentFix      *string     `json:"permanentFix"`
	LinkedChangeID    *uuid.UUID  `json:"linkedChangeId"`
	OwnerID           *uuid.UUID  `json:"ownerId"`
	CreatedAt         time.Time   `json:"createdAt"`
	UpdatedAt         time.Time   `json:"updatedAt"`
}

// KnownError represents a documented known error with a workaround.
type KnownError struct {
	ID            uuid.UUID  `json:"id"`
	ProblemID     uuid.UUID  `json:"problemId"`
	Title         string     `json:"title"`
	Description   *string    `json:"description"`
	Workaround    *string    `json:"workaround"`
	KBArticleID   *uuid.UUID `json:"kbArticleId"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// SupportQueue represents a team-based queue for ticket routing.
type SupportQueue struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenantId"`
	Name           string    `json:"name"`
	TeamID         *uuid.UUID `json:"teamId"`
	PriorityFilter []string  `json:"priorityFilter"`
	AutoAssignRule string    `json:"autoAssignRule"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
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
	Total           int `json:"total"`
	OpenCount       int `json:"openCount"`
	SLABreachedCount int `json:"slaBreachedCount"`
	MajorIncidents  int `json:"majorIncidents"`
}

// SLAComplianceStats provides SLA compliance metrics.
type SLAComplianceStats struct {
	TotalTickets  int `json:"totalTickets"`
	ResponseMet   int `json:"responseMet"`
	ResolutionMet int `json:"resolutionMet"`
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
	Type        string          `json:"type" validate:"required"`
	Category    *string         `json:"category"`
	Subcategory *string         `json:"subcategory"`
	Title       string          `json:"title" validate:"required"`
	Description string          `json:"description" validate:"required"`
	Priority    *string         `json:"priority"`
	Urgency     string          `json:"urgency" validate:"required"`
	Impact      string          `json:"impact" validate:"required"`
	Channel     *string         `json:"channel"`
	AssigneeID  *uuid.UUID      `json:"assigneeId"`
	TeamQueueID *uuid.UUID      `json:"teamQueueId"`
	SLAPolicyID *uuid.UUID      `json:"slaPolicyId"`
	Tags        []string        `json:"tags"`
	CustomFields json.RawMessage `json:"customFields"`
}

// UpdateTicketRequest is the payload for updating ticket metadata.
type UpdateTicketRequest struct {
	Category    *string         `json:"category"`
	Subcategory *string         `json:"subcategory"`
	Title       *string         `json:"title"`
	Description *string         `json:"description"`
	Tags        []string        `json:"tags"`
	CustomFields json.RawMessage `json:"customFields"`
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

// AddCommentRequest is the payload for adding a comment to a ticket.
type AddCommentRequest struct {
	Content    string `json:"content" validate:"required"`
	IsInternal *bool  `json:"isInternal"`
}

// LinkTicketsRequest is the payload for linking two tickets.
type LinkTicketsRequest struct {
	RelatedTicketID uuid.UUID `json:"relatedTicketId" validate:"required"`
}

// ResolveTicketRequest is the payload for resolving a ticket.
type ResolveTicketRequest struct {
	ResolutionNotes string `json:"resolutionNotes" validate:"required"`
}

// DeclareMajorIncidentRequest is the payload for declaring a major incident.
type DeclareMajorIncidentRequest struct {
	CommunicationPlan *string `json:"communicationPlan"`
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

// CreateProblemRequest is the payload for creating a problem record.
type CreateProblemRequest struct {
	Title       string     `json:"title" validate:"required"`
	Description *string    `json:"description"`
	OwnerID     *uuid.UUID `json:"ownerId"`
}

// UpdateProblemRequest is the payload for updating a problem record.
type UpdateProblemRequest struct {
	Title          *string    `json:"title"`
	Description    *string    `json:"description"`
	RootCause      *string    `json:"rootCause"`
	Status         *string    `json:"status"`
	Workaround     *string    `json:"workaround"`
	PermanentFix   *string    `json:"permanentFix"`
	LinkedChangeID *uuid.UUID `json:"linkedChangeId"`
	OwnerID        *uuid.UUID `json:"ownerId"`
}

// LinkIncidentToProblemRequest is the payload for linking an incident to a problem.
type LinkIncidentToProblemRequest struct {
	IncidentID uuid.UUID `json:"incidentId" validate:"required"`
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

// validTicketTransitions defines the allowed state machine transitions for tickets.
var validTicketTransitions = map[string][]string{
	TicketStatusLogged:          {TicketStatusClassified, TicketStatusAssigned, TicketStatusCancelled},
	TicketStatusClassified:      {TicketStatusAssigned, TicketStatusCancelled},
	TicketStatusAssigned:        {TicketStatusInProgress, TicketStatusCancelled},
	TicketStatusInProgress:      {TicketStatusPendingCustomer, TicketStatusPendingVendor, TicketStatusResolved, TicketStatusCancelled},
	TicketStatusPendingCustomer: {TicketStatusInProgress, TicketStatusResolved, TicketStatusCancelled},
	TicketStatusPendingVendor:   {TicketStatusInProgress, TicketStatusResolved, TicketStatusCancelled},
	TicketStatusResolved:        {TicketStatusClosed, TicketStatusInProgress},
	TicketStatusClosed:          {},
	TicketStatusCancelled:       {},
}

// IsValidTicketTransition checks whether a status transition from -> to is allowed.
func IsValidTicketTransition(from, to string) bool {
	allowed, ok := validTicketTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

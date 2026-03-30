package itsm

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	MajorIncidentSeveritySev1 = "sev1"
	MajorIncidentSeveritySev2 = "sev2"
	MajorIncidentSeveritySev3 = "sev3"
)

const (
	MajorIncidentStatusDeclared      = "declared"
	MajorIncidentStatusInvestigating = "investigating"
	MajorIncidentStatusMitigating    = "mitigating"
	MajorIncidentStatusMitigated     = "mitigated"
	MajorIncidentStatusMonitoring    = "monitoring"
	MajorIncidentStatusResolved      = "resolved"
	MajorIncidentStatusPIRPending    = "pir_pending"
	MajorIncidentStatusClosed        = "closed"
)

const (
	MajorIncidentUpdateTypeStatus    = "status_update"
	MajorIncidentUpdateTypeComms     = "comms"
	MajorIncidentUpdateTypeTechnical = "technical"
)

type MajorIncidentStakeholderUpdate struct {
	Timestamp      time.Time `json:"timestamp"`
	AuthorID       uuid.UUID `json:"authorId"`
	AuthorName     *string   `json:"authorName,omitempty"`
	AuthorPhotoURL *string   `json:"authorPhotoUrl,omitempty"`
	Message        string    `json:"message"`
	Type           string    `json:"type"`
}

type MajorIncidentCommunicationPlan struct {
	InternalStakeholders   []uuid.UUID `json:"internalStakeholders"`
	ExternalStakeholders   []string    `json:"externalStakeholders"`
	UpdateFrequencyMinutes int         `json:"updateFrequencyMinutes"`
	Channels               []string    `json:"channels"`
}

type MajorIncidentPerson struct {
	ID          uuid.UUID `json:"id"`
	DisplayName string    `json:"displayName"`
	Email       *string   `json:"email,omitempty"`
	Phone       *string   `json:"phone,omitempty"`
	PhotoURL    *string   `json:"photoUrl,omitempty"`
	Department  *string   `json:"department,omitempty"`
	JobTitle    *string   `json:"jobTitle,omitempty"`
}

type MajorIncidentTicketSummary struct {
	ID              uuid.UUID  `json:"id"`
	TicketNumber    string     `json:"ticketNumber"`
	Title           string     `json:"title"`
	Status          string     `json:"status"`
	Priority        string     `json:"priority"`
	ReporterID      uuid.UUID  `json:"reporterId"`
	ReporterName    *string    `json:"reporterName,omitempty"`
	AssigneeID      *uuid.UUID `json:"assigneeId,omitempty"`
	AssigneeName    *string    `json:"assigneeName,omitempty"`
	LinkedProblemID *uuid.UUID `json:"linkedProblemId,omitempty"`
}

type MajorIncidentTimelineEntry struct {
	ID          string          `json:"id"`
	Action      string          `json:"action"`
	Label       string          `json:"label"`
	Description *string         `json:"description,omitempty"`
	ActorID     *uuid.UUID      `json:"actorId,omitempty"`
	ActorName   *string         `json:"actorName,omitempty"`
	Timestamp   time.Time       `json:"timestamp"`
	Metadata    json.RawMessage `json:"metadata,omitempty"`
}

type MajorIncidentRecord struct {
	ID                     uuid.UUID                        `json:"id"`
	TenantID               uuid.UUID                        `json:"tenantId"`
	TicketID               uuid.UUID                        `json:"ticketId"`
	Severity               string                           `json:"severity"`
	IncidentCommanderID    *uuid.UUID                       `json:"incidentCommanderId"`
	CommunicationLeadID    *uuid.UUID                       `json:"communicationLeadId"`
	BridgeURL              *string                          `json:"bridgeUrl"`
	BridgePhone            *string                          `json:"bridgePhone"`
	AffectedServices       []string                         `json:"affectedServices"`
	AffectedCIIDs          []uuid.UUID                      `json:"affectedCiIds"`
	EstimatedAffectedUsers int                              `json:"estimatedAffectedUsers"`
	BusinessImpact         *string                          `json:"businessImpact"`
	Status                 string                           `json:"status"`
	StakeholderUpdates     []MajorIncidentStakeholderUpdate `json:"stakeholderUpdates"`
	ResolutionSummary      *string                          `json:"resolutionSummary"`
	RootCauseSummary       *string                          `json:"rootCauseSummary"`
	PIRScheduledDate       *time.Time                       `json:"pirScheduledDate"`
	PIRCompletedDate       *time.Time                       `json:"pirCompletedDate"`
	PIRReport              json.RawMessage                  `json:"pirReport,omitempty"`
	CommunicationPlan      MajorIncidentCommunicationPlan   `json:"communicationPlan"`
	DeclaredAt             time.Time                        `json:"declaredAt"`
	ResolvedAt             *time.Time                       `json:"resolvedAt"`
	ClosedAt               *time.Time                       `json:"closedAt"`
	TotalDurationMinutes   *int                             `json:"totalDurationMinutes"`
	CreatedAt              time.Time                        `json:"createdAt"`
	UpdatedAt              time.Time                        `json:"updatedAt"`
	LastUpdateAt           *time.Time                       `json:"lastUpdateAt,omitempty"`
	LastUpdateMessage      *string                          `json:"lastUpdateMessage,omitempty"`
	Ticket                 *MajorIncidentTicketSummary      `json:"ticket,omitempty"`
	IncidentCommander      *MajorIncidentPerson             `json:"incidentCommander,omitempty"`
	CommunicationLead      *MajorIncidentPerson             `json:"communicationLead,omitempty"`
	Timeline               []MajorIncidentTimelineEntry     `json:"timeline,omitempty"`
}

type MajorIncidentStats struct {
	Total              int            `json:"total"`
	Active             int            `json:"active"`
	AvgDurationMinutes float64        `json:"avgDurationMinutes"`
	ByStatus           map[string]int `json:"byStatus"`
	BySeverity         map[string]int `json:"bySeverity"`
}

type DeclareMajorIncidentWorkflowRequest struct {
	TicketID               uuid.UUID                       `json:"ticketId"`
	Severity               string                          `json:"severity"`
	IncidentCommanderID    *uuid.UUID                      `json:"incidentCommanderId"`
	CommunicationLeadID    *uuid.UUID                      `json:"communicationLeadId"`
	BridgeURL              *string                         `json:"bridgeUrl"`
	BridgePhone            *string                         `json:"bridgePhone"`
	AffectedServices       []string                        `json:"affectedServices"`
	AffectedCIIDs          []uuid.UUID                     `json:"affectedCiIds"`
	EstimatedAffectedUsers *int                            `json:"estimatedAffectedUsers"`
	BusinessImpact         *string                         `json:"businessImpact"`
	CommunicationPlan      *MajorIncidentCommunicationPlan `json:"communicationPlan"`
}

type PostMajorIncidentUpdateRequest struct {
	Message    string `json:"message"`
	UpdateType string `json:"updateType"`
}

type TransitionMajorIncidentRequest struct {
	TargetStatus string `json:"targetStatus"`
}

type ResolveMajorIncidentRequest struct {
	ResolutionSummary string `json:"resolutionSummary"`
	RootCause         string `json:"rootCause"`
}

type SubmitMajorIncidentPIRRequest struct {
	PIRReport json.RawMessage `json:"pirReport"`
}

type UpdateMajorIncidentCommunicationPlanRequest struct {
	CommunicationPlan MajorIncidentCommunicationPlan `json:"communicationPlan"`
}

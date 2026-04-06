package governance

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Policy status constants
// ──────────────────────────────────────────────

const (
	PolicyStatusDraft     = "draft"
	PolicyStatusInReview  = "in_review"
	PolicyStatusApproved  = "approved"
	PolicyStatusPublished = "published"
	PolicyStatusRetired   = "retired"
)

// ──────────────────────────────────────────────
// Action item status constants
// ──────────────────────────────────────────────

const (
	ActionStatusOpen       = "open"
	ActionStatusInProgress = "in_progress"
	ActionStatusCompleted  = "completed"
	ActionStatusOverdue    = "overdue"
	ActionStatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// Meeting status constants
// ──────────────────────────────────────────────

const (
	MeetingStatusScheduled = "scheduled"
	MeetingStatusInProgress = "in_progress"
	MeetingStatusCompleted  = "completed"
	MeetingStatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// OKR status constants
// ──────────────────────────────────────────────

const (
	OKRStatusDraft      = "draft"
	OKRStatusActive     = "active"
	OKRStatusCompleted  = "completed"
	OKRStatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// Key Result status constants
// ──────────────────────────────────────────────

const (
	KRStatusOnTrack  = "on_track"
	KRStatusAtRisk   = "at_risk"
	KRStatusBehind   = "behind"
	KRStatusAchieved = "achieved"
)

// ──────────────────────────────────────────────
// Attestation status constants
// ──────────────────────────────────────────────

const (
	AttestationPending  = "pending"
	AttestationAttested = "attested"
	AttestationDeclined = "declined"
	AttestationOverdue  = "overdue"
)

// ──────────────────────────────────────────────
// Campaign status constants
// ──────────────────────────────────────────────

const (
	CampaignStatusActive    = "active"
	CampaignStatusCompleted = "completed"
	CampaignStatusCancelled = "cancelled"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// Policy represents an organizational policy document.
type Policy struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenantId"`
	Title          string     `json:"title"`
	Description    *string    `json:"description"`
	Category       string     `json:"category"`
	Tags           []string   `json:"tags"`
	ScopeType      string     `json:"scopeType"`
	ScopeTenantIDs []uuid.UUID `json:"scopeTenantIds"`
	Status         string     `json:"status"`
	Version        int        `json:"version"`
	Content        string     `json:"content"`
	EffectiveDate  *time.Time `json:"effectiveDate"`
	ReviewDate     *time.Time `json:"reviewDate"`
	ExpiryDate     *time.Time `json:"expiryDate"`
	OwnerID        *uuid.UUID `json:"ownerId"`
	CreatedBy      uuid.UUID  `json:"createdBy"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// PolicyVersion represents an immutable snapshot of a policy at a given version.
type PolicyVersion struct {
	ID             uuid.UUID `json:"id"`
	PolicyID       uuid.UUID `json:"policyId"`
	Version        int       `json:"version"`
	Title          string    `json:"title"`
	Content        string    `json:"content"`
	ChangesSummary *string   `json:"changesSummary"`
	CreatedBy      uuid.UUID `json:"createdBy"`
	CreatedAt      time.Time `json:"createdAt"`
}

// PolicyAttestation represents a user's acknowledgement of a policy version.
type PolicyAttestation struct {
	ID            uuid.UUID  `json:"id"`
	PolicyID      uuid.UUID  `json:"policyId"`
	PolicyVersion int        `json:"policyVersion"`
	UserID        uuid.UUID  `json:"userId"`
	TenantID      uuid.UUID  `json:"tenantId"`
	AttestedAt    *time.Time `json:"attestedAt"`
	Status        string     `json:"status"`
	CampaignID    *uuid.UUID `json:"campaignId"`
	ReminderSentAt *time.Time `json:"reminderSentAt"`
}

// AttestationCampaign represents a campaign to collect policy attestations.
type AttestationCampaign struct {
	ID             uuid.UUID   `json:"id"`
	TenantID       uuid.UUID   `json:"tenantId"`
	PolicyID       uuid.UUID   `json:"policyId"`
	PolicyVersion  int         `json:"policyVersion"`
	TargetScope    string      `json:"targetScope"`
	TargetUserIDs  []uuid.UUID `json:"targetUserIds"`
	DueDate        time.Time   `json:"dueDate"`
	Status         string      `json:"status"`
	CompletionRate *float64    `json:"completionRate"`
	CreatedBy      uuid.UUID   `json:"createdBy"`
	CreatedAt      time.Time   `json:"createdAt"`
}

// RACIMatrix represents a RACI responsibility assignment matrix.
type RACIMatrix struct {
	ID          uuid.UUID   `json:"id"`
	TenantID    uuid.UUID   `json:"tenantId"`
	Title       string      `json:"title"`
	EntityType  string      `json:"entityType"`
	EntityID    *uuid.UUID  `json:"entityId"`
	Description *string     `json:"description"`
	Status      string      `json:"status"`
	CreatedBy   uuid.UUID   `json:"createdBy"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
	Entries     []RACIEntry `json:"entries"`
}

// RACIEntry represents a single row in a RACI matrix.
type RACIEntry struct {
	ID             uuid.UUID   `json:"id"`
	MatrixID       uuid.UUID   `json:"matrixId"`
	Activity       string      `json:"activity"`
	ResponsibleIDs []uuid.UUID `json:"responsibleIds"`
	AccountableID  uuid.UUID   `json:"accountableId"`
	ConsultedIDs   []uuid.UUID `json:"consultedIds"`
	InformedIDs    []uuid.UUID `json:"informedIds"`
	Notes          *string     `json:"notes"`
	// Resolved display names (populated server-side via user lookup)
	ResponsibleNames []string `json:"responsibleNames"`
	AccountableName  string   `json:"accountableName"`
	ConsultedNames   []string `json:"consultedNames"`
	InformedNames    []string `json:"informedNames"`
}

// Meeting represents a governance meeting.
type Meeting struct {
	ID              uuid.UUID   `json:"id"`
	TenantID        uuid.UUID   `json:"tenantId"`
	Title           string      `json:"title"`
	MeetingType     *string     `json:"meetingType"`
	Agenda          *string     `json:"agenda"`
	Minutes         *string     `json:"minutes"`
	Location        *string     `json:"location"`
	ScheduledAt     time.Time   `json:"scheduledAt"`
	DurationMinutes *int        `json:"durationMinutes"`
	RecurrenceRule  *string     `json:"recurrenceRule"`
	TemplateAgenda  *string     `json:"templateAgenda"`
	AttendeeIDs     []uuid.UUID `json:"attendeeIds"`
	OrganizerID     uuid.UUID   `json:"organizerId"`
	Status          string      `json:"status"`
	CreatedAt       time.Time   `json:"createdAt"`
}

// MeetingDecision represents a decision recorded during a meeting.
type MeetingDecision struct {
	ID               uuid.UUID   `json:"id"`
	MeetingID        uuid.UUID   `json:"meetingId"`
	TenantID         uuid.UUID   `json:"tenantId"`
	DecisionNumber   string      `json:"decisionNumber"`
	Title            string      `json:"title"`
	Description      string      `json:"description"`
	Rationale        *string     `json:"rationale"`
	ImpactAssessment *string     `json:"impactAssessment"`
	DecidedByIDs     []uuid.UUID `json:"decidedByIds"`
	Status           string      `json:"status"`
	EvidenceRefs     []uuid.UUID `json:"evidenceRefs"`
	CreatedAt        time.Time   `json:"createdAt"`
}

// ActionItem represents a tracked action item from any governance source.
type ActionItem struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenantId"`
	SourceType         string     `json:"sourceType"`
	SourceID           uuid.UUID  `json:"sourceId"`
	Title              string     `json:"title"`
	Description        *string    `json:"description"`
	OwnerID            uuid.UUID  `json:"ownerId"`
	DueDate            time.Time  `json:"dueDate"`
	Status             string     `json:"status"`
	CompletionEvidence *string    `json:"completionEvidence"`
	CompletedAt        *time.Time `json:"completedAt"`
	Priority           string     `json:"priority"`
	CreatedAt          time.Time  `json:"createdAt"`
}

// OKR represents an Objective and Key Results entry.
type OKR struct {
	ID            uuid.UUID   `json:"id"`
	TenantID      uuid.UUID   `json:"tenantId"`
	ParentID      *uuid.UUID  `json:"parentId"`
	Level         string      `json:"level"`
	ScopeID       *uuid.UUID  `json:"scopeId"`
	Objective     string      `json:"objective"`
	Period        string      `json:"period"`
	OwnerID       uuid.UUID   `json:"ownerId"`
	Status        string      `json:"status"`
	ProgressPct   *float64    `json:"progressPct"`
	ScoringMethod string      `json:"scoringMethod"`
	CreatedAt     time.Time   `json:"createdAt"`
	KeyResults    []KeyResult `json:"keyResults"`
	Children      []OKR       `json:"children"`
}

// KeyResult represents a measurable outcome tied to an OKR.
type KeyResult struct {
	ID           uuid.UUID `json:"id"`
	OKRID        uuid.UUID `json:"okrId"`
	Title        string    `json:"title"`
	TargetValue  *float64  `json:"targetValue"`
	CurrentValue *float64  `json:"currentValue"`
	Unit         *string   `json:"unit"`
	Status       string    `json:"status"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// KPI represents a Key Performance Indicator.
type KPI struct {
	ID                uuid.UUID  `json:"id"`
	TenantID          uuid.UUID  `json:"tenantId"`
	Name              string     `json:"name"`
	Description       *string    `json:"description"`
	Formula           *string    `json:"formula"`
	TargetValue       *float64   `json:"targetValue"`
	WarningThreshold  *float64   `json:"warningThreshold"`
	CriticalThreshold *float64   `json:"criticalThreshold"`
	CurrentValue      *float64   `json:"currentValue"`
	Unit              *string    `json:"unit"`
	Frequency         string     `json:"frequency"`
	OwnerID           *uuid.UUID `json:"ownerId"`
	LastUpdatedAt     *time.Time `json:"lastUpdatedAt"`
}

// ──────────────────────────────────────────────
// Composite / summary types
// ──────────────────────────────────────────────

// VersionDiff represents the difference between two policy versions.
type VersionDiff struct {
	V1         int    `json:"v1"`
	V2         int    `json:"v2"`
	OldTitle   string `json:"oldTitle"`
	NewTitle   string `json:"newTitle"`
	OldContent string `json:"oldContent"`
	NewContent string `json:"newContent"`
}

// AttestationStatus provides an aggregate summary of attestation progress.
type AttestationStatus struct {
	TotalUsers     int     `json:"totalUsers"`
	AttestedCount  int     `json:"attestedCount"`
	PendingCount   int     `json:"pendingCount"`
	OverdueCount   int     `json:"overdueCount"`
	CompletionRate float64 `json:"completionRate"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreatePolicyRequest is the payload for creating a new policy.
type CreatePolicyRequest struct {
	Title          string      `json:"title" validate:"required"`
	Description    *string     `json:"description"`
	Category       string      `json:"category" validate:"required"`
	Tags           []string    `json:"tags"`
	ScopeType      *string     `json:"scopeType"`
	ScopeTenantIDs []uuid.UUID `json:"scopeTenantIds"`
	Content        string      `json:"content" validate:"required"`
	EffectiveDate  *time.Time  `json:"effectiveDate"`
	ReviewDate     *time.Time  `json:"reviewDate"`
	ExpiryDate     *time.Time  `json:"expiryDate"`
	OwnerID        *uuid.UUID  `json:"ownerId"`
}

// UpdatePolicyRequest is the payload for updating an existing policy.
type UpdatePolicyRequest struct {
	Title          *string     `json:"title"`
	Description    *string     `json:"description"`
	Category       *string     `json:"category"`
	Tags           []string    `json:"tags"`
	ScopeType      *string     `json:"scopeType"`
	ScopeTenantIDs []uuid.UUID `json:"scopeTenantIds"`
	Content        *string     `json:"content"`
	EffectiveDate  *time.Time  `json:"effectiveDate"`
	ReviewDate     *time.Time  `json:"reviewDate"`
	ExpiryDate     *time.Time  `json:"expiryDate"`
	OwnerID        *uuid.UUID  `json:"ownerId"`
	ChangesSummary *string     `json:"changesSummary"`
}

// LaunchCampaignRequest is the payload for launching an attestation campaign.
type LaunchCampaignRequest struct {
	TargetScope   string      `json:"targetScope" validate:"required"`
	TargetUserIDs []uuid.UUID `json:"targetUserIds"`
	DueDate       time.Time   `json:"dueDate" validate:"required"`
}

// CreateRACIMatrixRequest is the payload for creating a new RACI matrix.
type CreateRACIMatrixRequest struct {
	Title       string     `json:"title" validate:"required"`
	EntityType  string     `json:"entityType" validate:"required"`
	EntityID    *uuid.UUID `json:"entityId"`
	Description *string    `json:"description"`
}

// CreateRACIEntryRequest is the payload for adding an entry to a RACI matrix.
type CreateRACIEntryRequest struct {
	Activity       string      `json:"activity" validate:"required"`
	ResponsibleIDs []uuid.UUID `json:"responsibleIds" validate:"required"`
	AccountableID  uuid.UUID   `json:"accountableId" validate:"required"`
	ConsultedIDs   []uuid.UUID `json:"consultedIds"`
	InformedIDs    []uuid.UUID `json:"informedIds"`
	Notes          *string     `json:"notes"`
}

// UpdateRACIEntryRequest is the payload for updating a RACI entry.
type UpdateRACIEntryRequest struct {
	Activity       *string     `json:"activity"`
	ResponsibleIDs []uuid.UUID `json:"responsibleIds"`
	AccountableID  *uuid.UUID  `json:"accountableId"`
	ConsultedIDs   []uuid.UUID `json:"consultedIds"`
	InformedIDs    []uuid.UUID `json:"informedIds"`
	Notes          *string     `json:"notes"`
}

// CreateMeetingRequest is the payload for scheduling a new meeting.
type CreateMeetingRequest struct {
	Title           string      `json:"title" validate:"required"`
	MeetingType     *string     `json:"meetingType"`
	Agenda          *string     `json:"agenda"`
	Location        *string     `json:"location"`
	ScheduledAt     time.Time   `json:"scheduledAt" validate:"required"`
	DurationMinutes *int        `json:"durationMinutes"`
	RecurrenceRule  *string     `json:"recurrenceRule"`
	TemplateAgenda  *string     `json:"templateAgenda"`
	AttendeeIDs     []uuid.UUID `json:"attendeeIds"`
}

// UpdateMeetingRequest is the payload for updating a meeting.
type UpdateMeetingRequest struct {
	Title           *string     `json:"title"`
	MeetingType     *string     `json:"meetingType"`
	Agenda          *string     `json:"agenda"`
	Minutes         *string     `json:"minutes"`
	Location        *string     `json:"location"`
	ScheduledAt     *time.Time  `json:"scheduledAt"`
	DurationMinutes *int        `json:"durationMinutes"`
	RecurrenceRule  *string     `json:"recurrenceRule"`
	TemplateAgenda  *string     `json:"templateAgenda"`
	AttendeeIDs     []uuid.UUID `json:"attendeeIds"`
	Status          *string     `json:"status"`
}

// CreateDecisionRequest is the payload for recording a meeting decision.
// DecisionNumber is always auto-generated by the service (DEC-YYYY-NNN).
type CreateDecisionRequest struct {
	Title            string      `json:"title" validate:"required"`
	Description      string      `json:"description" validate:"required"`
	Rationale        *string     `json:"rationale"`
	ImpactAssessment *string     `json:"impactAssessment"`
	DecidedByIDs     []uuid.UUID `json:"decidedByIds"`
	EvidenceRefs     []uuid.UUID `json:"evidenceRefs"`
}

// CreateActionItemRequest is the payload for creating an action item.
type CreateActionItemRequest struct {
	SourceType  string     `json:"sourceType" validate:"required"`
	SourceID    uuid.UUID  `json:"sourceId" validate:"required"`
	Title       string     `json:"title" validate:"required"`
	Description *string    `json:"description"`
	OwnerID     uuid.UUID  `json:"ownerId" validate:"required"`
	DueDate     time.Time  `json:"dueDate" validate:"required"`
	Priority    *string    `json:"priority"`
}

// UpdateActionItemRequest is the payload for updating an action item.
type UpdateActionItemRequest struct {
	Title              *string    `json:"title"`
	Description        *string    `json:"description"`
	OwnerID            *uuid.UUID `json:"ownerId"`
	DueDate            *time.Time `json:"dueDate"`
	Status             *string    `json:"status"`
	CompletionEvidence *string    `json:"completionEvidence"`
	Priority           *string    `json:"priority"`
}

// CreateOKRRequest is the payload for creating an OKR.
type CreateOKRRequest struct {
	ParentID      *uuid.UUID `json:"parentId"`
	Level         string     `json:"level" validate:"required"`
	ScopeID       *uuid.UUID `json:"scopeId"`
	Objective     string     `json:"objective" validate:"required"`
	Period        string     `json:"period" validate:"required"`
	OwnerID       uuid.UUID  `json:"ownerId" validate:"required"`
	ScoringMethod *string    `json:"scoringMethod"`
}

// UpdateOKRRequest is the payload for updating an OKR.
type UpdateOKRRequest struct {
	Objective     *string  `json:"objective"`
	Period        *string  `json:"period"`
	Status        *string  `json:"status"`
	ProgressPct   *float64 `json:"progressPct"`
	ScoringMethod *string  `json:"scoringMethod"`
}

// CreateKeyResultRequest is the payload for adding a key result to an OKR.
type CreateKeyResultRequest struct {
	Title       string   `json:"title" validate:"required"`
	TargetValue *float64 `json:"targetValue"`
	Unit        *string  `json:"unit"`
}

// UpdateKeyResultRequest is the payload for updating a key result.
type UpdateKeyResultRequest struct {
	Title        *string  `json:"title"`
	TargetValue  *float64 `json:"targetValue"`
	CurrentValue *float64 `json:"currentValue"`
	Unit         *string  `json:"unit"`
	Status       *string  `json:"status"`
}

// CreateKPIRequest is the payload for creating a KPI.
type CreateKPIRequest struct {
	Name              string     `json:"name" validate:"required"`
	Description       *string    `json:"description"`
	Formula           *string    `json:"formula"`
	TargetValue       *float64   `json:"targetValue"`
	WarningThreshold  *float64   `json:"warningThreshold"`
	CriticalThreshold *float64   `json:"criticalThreshold"`
	Unit              *string    `json:"unit"`
	Frequency         *string    `json:"frequency"`
	OwnerID           *uuid.UUID `json:"ownerId"`
}

// UpdateKPIRequest is the payload for updating a KPI.
type UpdateKPIRequest struct {
	Name              *string    `json:"name"`
	Description       *string    `json:"description"`
	Formula           *string    `json:"formula"`
	TargetValue       *float64   `json:"targetValue"`
	WarningThreshold  *float64   `json:"warningThreshold"`
	CriticalThreshold *float64   `json:"criticalThreshold"`
	CurrentValue      *float64   `json:"currentValue"`
	Unit              *string    `json:"unit"`
	Frequency         *string    `json:"frequency"`
	OwnerID           *uuid.UUID `json:"ownerId"`
}

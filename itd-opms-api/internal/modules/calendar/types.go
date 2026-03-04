package calendar

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Window type constants
// ──────────────────────────────────────────────

const (
	WindowTypeMaintenance = "maintenance"
	WindowTypeDeployment  = "deployment"
	WindowTypeRelease     = "release"
	WindowTypeFreeze      = "freeze"
	WindowTypeOutage      = "outage"
)

// ──────────────────────────────────────────────
// Window status constants
// ──────────────────────────────────────────────

const (
	StatusScheduled  = "scheduled"
	StatusInProgress = "in_progress"
	StatusCompleted  = "completed"
	StatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// Impact level constants
// ──────────────────────────────────────────────

const (
	ImpactNone     = "none"
	ImpactLow      = "low"
	ImpactMedium   = "medium"
	ImpactHigh     = "high"
	ImpactCritical = "critical"
)

// ──────────────────────────────────────────────
// Event type color mapping
// ──────────────────────────────────────────────

// EventTypeColors maps calendar event types to their display colors.
var EventTypeColors = map[string]string{
	"maintenance":      "#3B82F6",
	"deployment":       "#8B5CF6",
	"release":          "#10B981",
	"freeze":           "#EF4444",
	"outage":           "#F97316",
	"milestone":        "#F59E0B",
	"change_request":   "#6366F1",
	"ticket_change":    "#EC4899",
	"project_deadline": "#14B8A6",
}

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// CalendarEvent is a unified event representation aggregated from multiple sources.
type CalendarEvent struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description *string   `json:"description"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	IsAllDay    bool      `json:"isAllDay"`
	EventType   string    `json:"eventType"`
	Status      string    `json:"status"`
	ImpactLevel string    `json:"impactLevel"`
	Source      string    `json:"source"`
	SourceID    string    `json:"sourceId"`
	SourceURL   string    `json:"sourceUrl"`
	Color       string    `json:"color"`
	CreatedBy   string    `json:"createdBy"`
}

// MaintenanceWindow represents a scheduled maintenance window in the database.
type MaintenanceWindow struct {
	ID               uuid.UUID `json:"id"`
	TenantID         uuid.UUID `json:"tenantId"`
	Title            string    `json:"title"`
	Description      *string   `json:"description"`
	WindowType       string    `json:"windowType"`
	Status           string    `json:"status"`
	StartTime        time.Time `json:"startTime"`
	EndTime          time.Time `json:"endTime"`
	IsAllDay         bool      `json:"isAllDay"`
	RecurrenceRule   *string   `json:"recurrenceRule"`
	AffectedServices []string  `json:"affectedServices"`
	ImpactLevel      string    `json:"impactLevel"`
	ChangeRequestID  *uuid.UUID `json:"changeRequestId"`
	TicketID         *uuid.UUID `json:"ticketId"`
	ProjectID        *uuid.UUID `json:"projectId"`
	CreatedBy        uuid.UUID  `json:"createdBy"`
	OrgUnitID        *uuid.UUID `json:"orgUnitId,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

// ChangeFreezePeriod represents a period during which changes are frozen.
type ChangeFreezePeriod struct {
	ID         uuid.UUID       `json:"id"`
	TenantID   uuid.UUID       `json:"tenantId"`
	Name       string          `json:"name"`
	Reason     *string         `json:"reason"`
	StartTime  time.Time       `json:"startTime"`
	EndTime    time.Time       `json:"endTime"`
	Exceptions json.RawMessage `json:"exceptions"`
	CreatedBy  uuid.UUID       `json:"createdBy"`
	OrgUnitID  *uuid.UUID      `json:"orgUnitId,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
}

// ConflictResult contains overlapping events and freeze periods for a given time range.
type ConflictResult struct {
	OverlappingEvents []CalendarEvent      `json:"overlappingEvents"`
	FreezePeriods     []ChangeFreezePeriod `json:"freezePeriods"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateMaintenanceWindowRequest is the payload for creating a maintenance window.
type CreateMaintenanceWindowRequest struct {
	Title            string     `json:"title" validate:"required"`
	Description      *string    `json:"description"`
	WindowType       string     `json:"windowType" validate:"required"`
	StartTime        time.Time  `json:"startTime" validate:"required"`
	EndTime          time.Time  `json:"endTime" validate:"required"`
	IsAllDay         bool       `json:"isAllDay"`
	RecurrenceRule   *string    `json:"recurrenceRule"`
	AffectedServices []string   `json:"affectedServices"`
	ImpactLevel      string     `json:"impactLevel"`
	ChangeRequestID  *uuid.UUID `json:"changeRequestId"`
	TicketID         *uuid.UUID `json:"ticketId"`
	ProjectID        *uuid.UUID `json:"projectId"`
}

// UpdateMaintenanceWindowRequest is the payload for updating a maintenance window.
type UpdateMaintenanceWindowRequest struct {
	Title            *string    `json:"title"`
	Description      *string    `json:"description"`
	WindowType       *string    `json:"windowType"`
	Status           *string    `json:"status"`
	StartTime        *time.Time `json:"startTime"`
	EndTime          *time.Time `json:"endTime"`
	IsAllDay         *bool      `json:"isAllDay"`
	RecurrenceRule   *string    `json:"recurrenceRule"`
	AffectedServices []string   `json:"affectedServices"`
	ImpactLevel      *string    `json:"impactLevel"`
	ChangeRequestID  *uuid.UUID `json:"changeRequestId"`
	TicketID         *uuid.UUID `json:"ticketId"`
	ProjectID        *uuid.UUID `json:"projectId"`
}

// CreateFreezePeriodRequest is the payload for creating a change freeze period.
type CreateFreezePeriodRequest struct {
	Name       string          `json:"name" validate:"required"`
	Reason     *string         `json:"reason"`
	StartTime  time.Time       `json:"startTime" validate:"required"`
	EndTime    time.Time       `json:"endTime" validate:"required"`
	Exceptions json.RawMessage `json:"exceptions"`
}

package reporting

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Report type constants
// ──────────────────────────────────────────────

const (
	ReportTypeExecutivePack = "executive_pack"
	ReportTypeSLAReport     = "sla_report"
	ReportTypeAssetReport   = "asset_report"
	ReportTypeGRCReport     = "grc_report"
	ReportTypePMOReport     = "pmo_report"
	ReportTypeCustom        = "custom"
)

// ──────────────────────────────────────────────
// Report run status constants
// ──────────────────────────────────────────────

const (
	RunStatusPending    = "pending"
	RunStatusGenerating = "generating"
	RunStatusCompleted  = "completed"
	RunStatusFailed     = "failed"
)

const (
	RunTriggerManual   = "manual"
	RunTriggerSchedule = "schedule"
	RunTriggerSystem   = "system"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// ReportDefinition represents a configurable report template.
type ReportDefinition struct {
	ID           uuid.UUID       `json:"id"`
	TenantID     uuid.UUID       `json:"tenantId"`
	Name         string          `json:"name"`
	Description  *string         `json:"description"`
	Type         string          `json:"type"`
	Template     json.RawMessage `json:"template"`
	ScheduleCron *string         `json:"scheduleCron"`
	Recipients   []uuid.UUID     `json:"recipients"`
	IsActive     bool            `json:"isActive"`
	CreatedBy    uuid.UUID       `json:"createdBy"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

// ReportRun represents an individual report generation run.
type ReportRun struct {
	ID            uuid.UUID       `json:"id"`
	DefinitionID  uuid.UUID       `json:"definitionId"`
	TenantID      uuid.UUID       `json:"tenantId"`
	Status        string          `json:"status"`
	TriggerSource string          `json:"triggerSource"`
	ScheduledFor  *time.Time      `json:"scheduledFor"`
	GeneratedAt   *time.Time      `json:"generatedAt"`
	CompletedAt   *time.Time      `json:"completedAt"`
	DocumentID    *uuid.UUID      `json:"documentId"`
	DataSnapshot  json.RawMessage `json:"dataSnapshot"`
	ErrorMessage  *string         `json:"errorMessage"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// DashboardCache represents cached dashboard aggregation data.
type DashboardCache struct {
	ID        uuid.UUID       `json:"id"`
	TenantID  uuid.UUID       `json:"tenantId"`
	CacheKey  string          `json:"cacheKey"`
	Data      json.RawMessage `json:"data"`
	ExpiresAt time.Time       `json:"expiresAt"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// SavedSearch represents a user saved or recent search query.
type SavedSearch struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	UserID      uuid.UUID `json:"userId"`
	Query       string    `json:"query"`
	EntityTypes []string  `json:"entityTypes"`
	IsSaved     bool      `json:"isSaved"`
	LastUsedAt  time.Time `json:"lastUsedAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ExecutiveSummary represents the materialized view for the executive dashboard.
type ExecutiveSummary struct {
	TenantID                   uuid.UUID      `json:"tenantId"`
	ActivePolicies             int            `json:"activePolicies"`
	OverdueActions             int            `json:"overdueActions"`
	PendingAttestations        int            `json:"pendingAttestations"`
	AvgOKRProgress             float64        `json:"avgOkrProgress"`
	OpenTickets                int            `json:"openTickets"`
	CriticalTickets            int            `json:"criticalTickets"`
	OpenTicketsP1              int            `json:"openTicketsP1"`
	OpenTicketsP2              int            `json:"openTicketsP2"`
	OpenTicketsP3              int            `json:"openTicketsP3"`
	OpenTicketsP4              int            `json:"openTicketsP4"`
	SLACompliancePct           float64        `json:"slaCompliancePct"`
	MTTRMinutes                float64        `json:"mttrMinutes"`
	MTTAMinutes                float64        `json:"mttaMinutes"`
	BacklogOver30Days          int            `json:"backlogOver30Days"`
	ActiveProjects             int            `json:"activeProjects"`
	ProjectsRAGGreen           int            `json:"projectsRagGreen"`
	ProjectsRAGAmber           int            `json:"projectsRagAmber"`
	ProjectsRAGRed             int            `json:"projectsRagRed"`
	OnTimeDeliveryPct          float64        `json:"onTimeDeliveryPct"`
	MilestoneBurnDownPct       float64        `json:"milestoneBurnDownPct"`
	ActiveAssets               int            `json:"activeAssets"`
	AssetCountsByType          map[string]int `json:"assetCountsByType"`
	AssetCountsByStatus        map[string]int `json:"assetCountsByStatus"`
	OverDeployedLicenses       int            `json:"overDeployedLicenses"`
	LicenseCompliancePct       float64        `json:"licenseCompliancePct"`
	WarrantiesExpiring90Days   int            `json:"warrantiesExpiring90Days"`
	HighRisks                  int            `json:"highRisks"`
	CriticalRisks              int            `json:"criticalRisks"`
	AuditReadinessScore        float64        `json:"auditReadinessScore"`
	AccessReviewCompletionPct  float64        `json:"accessReviewCompletionPct"`
	TeamCapacityUtilizationPct float64        `json:"teamCapacityUtilizationPct"`
	OverdueTrainingCerts       int            `json:"overdueTrainingCerts"`
	ExpiringCerts              int            `json:"expiringCerts"`
	OpenP1Incidents            int            `json:"openP1Incidents"`
	SLABreaches24h             int            `json:"slaBreaches24h"`
	RefreshedAt                time.Time      `json:"refreshedAt"`
}

// ChartDataPoint represents a single label-value pair for chart rendering.
type ChartDataPoint struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

// SLAComplianceRate represents the calculated SLA compliance percentage.
type SLAComplianceRate struct {
	Rate float64 `json:"rate"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateReportDefinitionRequest is the payload for creating a new report definition.
type CreateReportDefinitionRequest struct {
	Name         string          `json:"name" validate:"required"`
	Description  *string         `json:"description"`
	Type         string          `json:"type" validate:"required"`
	Template     json.RawMessage `json:"template"`
	ScheduleCron *string         `json:"scheduleCron"`
	Recipients   []uuid.UUID     `json:"recipients"`
}

// UpdateReportDefinitionRequest is the payload for updating an existing report definition (partial update).
type UpdateReportDefinitionRequest struct {
	Name         *string         `json:"name"`
	Description  *string         `json:"description"`
	Type         *string         `json:"type"`
	Template     json.RawMessage `json:"template"`
	ScheduleCron *string         `json:"scheduleCron"`
	Recipients   []uuid.UUID     `json:"recipients"`
	IsActive     *bool           `json:"isActive"`
}

// CreateSavedSearchRequest is the payload for creating a new saved search.
type CreateSavedSearchRequest struct {
	Query       string   `json:"query" validate:"required"`
	EntityTypes []string `json:"entityTypes"`
	IsSaved     bool     `json:"isSaved"`
}

// ──────────────────────────────────────────────
// Activity Feed types
// ──────────────────────────────────────────────

// ActivityActor identifies the user who performed an action.
type ActivityActor struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Avatar *string `json:"avatar,omitempty"`
}

// ActivityEntity identifies the entity that was acted upon.
type ActivityEntity struct {
	Type  string `json:"type"`
	ID    string `json:"id"`
	Label string `json:"label"`
	Href  string `json:"href"`
}

// ActivityFeedItem represents a single recent-activity event.
type ActivityFeedItem struct {
	ID          string         `json:"id"`
	Type        string         `json:"type"`
	Actor       ActivityActor  `json:"actor"`
	Description string         `json:"description"`
	Entity      ActivityEntity `json:"entity"`
	Timestamp   time.Time      `json:"timestamp"`
}

// ActivityFeedResponse wraps a paginated list of activity feed items.
type ActivityFeedResponse struct {
	Data  []ActivityFeedItem `json:"data"`
	Total int                `json:"total"`
	Page  int                `json:"page"`
	Limit int                `json:"limit"`
}

// ──────────────────────────────────────────────
// My-Tasks types
// ──────────────────────────────────────────────

// MyTicketItem represents a ticket in the my-tasks summary.
type MyTicketItem struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Href     string `json:"href"`
	Priority string `json:"priority"`
}

// MyDeadlineItem represents a deadline-sensitive task in the my-tasks summary.
type MyDeadlineItem struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Href    string `json:"href"`
	DueDate string `json:"dueDate"`
}

// MyApprovalItem represents a pending-approval action item.
type MyApprovalItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Href  string `json:"href"`
	Type  string `json:"type"`
}

// MyOpenTickets holds count + items for open tickets assigned to the user.
type MyOpenTickets struct {
	Count int            `json:"count"`
	Items []MyTicketItem `json:"items"`
}

// MyTasksDue holds count + items for tasks due this week.
type MyTasksDue struct {
	Count int              `json:"count"`
	Items []MyDeadlineItem `json:"items"`
}

// MyPendingApprovals holds count + items for pending approvals.
type MyPendingApprovals struct {
	Count int              `json:"count"`
	Items []MyApprovalItem `json:"items"`
}

// MyOverdueItems holds count + items for overdue action items.
type MyOverdueItems struct {
	Count int              `json:"count"`
	Items []MyDeadlineItem `json:"items"`
}

// MyTasksSummary is the full response for /dashboards/my-tasks.
type MyTasksSummary struct {
	OpenTickets      MyOpenTickets      `json:"openTickets"`
	TasksDueThisWeek MyTasksDue         `json:"tasksDueThisWeek"`
	PendingApprovals MyPendingApprovals `json:"pendingApprovals"`
	OverdueItems     MyOverdueItems     `json:"overdueItems"`
}

// ──────────────────────────────────────────────
// Upcoming Events types
// ──────────────────────────────────────────────

// UpcomingEvent represents a single upcoming event or deadline.
type UpcomingEvent struct {
	ID    string  `json:"id"`
	Title string  `json:"title"`
	Type  string  `json:"type"`
	Date  string  `json:"date"`
	Href  *string `json:"href,omitempty"`
}

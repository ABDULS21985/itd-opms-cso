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

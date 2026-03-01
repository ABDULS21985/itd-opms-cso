package people

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Heatmap response types
// ──────────────────────────────────────────────

// HeatmapResponse is the top-level response for the capacity heatmap endpoint.
type HeatmapResponse struct {
	Periods []string       `json:"periods"`
	Rows    []HeatmapRow   `json:"rows"`
	Summary HeatmapSummary `json:"summary"`
}

// HeatmapRow represents a single entity (user or project) row in the heatmap grid.
type HeatmapRow struct {
	ID          uuid.UUID     `json:"id"`
	Label       string        `json:"label"`
	Cells       []HeatmapCell `json:"cells"`
	AverageLoad float64       `json:"averageLoad"`
}

// HeatmapCell represents one cell in the heatmap grid (entity x period).
type HeatmapCell struct {
	Period        string           `json:"period"`
	AllocationPct float64          `json:"allocationPct"`
	ProjectCount  int              `json:"projectCount"`
	Projects      []HeatmapProject `json:"projects"`
}

// HeatmapProject describes a single project allocation within a heatmap cell.
type HeatmapProject struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	Pct   float64   `json:"pct"`
}

// HeatmapSummary provides aggregate statistics for the heatmap view.
type HeatmapSummary struct {
	TotalUsers         int     `json:"totalUsers"`
	OverAllocatedUsers int     `json:"overAllocatedUsers"`
	UnderUtilizedUsers int     `json:"underUtilizedUsers"`
	AverageUtilization float64 `json:"averageUtilization"`
}

// ──────────────────────────────────────────────
// Allocation entry (enriched view)
// ──────────────────────────────────────────────

// AllocationEntry is an enriched capacity allocation with joined user/project names.
type AllocationEntry struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	UserID        uuid.UUID `json:"userId"`
	UserName      string    `json:"userName"`
	ProjectID     uuid.UUID `json:"projectId"`
	ProjectTitle  string    `json:"projectTitle"`
	AllocationPct float64   `json:"allocationPct"`
	PeriodStart   time.Time `json:"periodStart"`
	PeriodEnd     time.Time `json:"periodEnd"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Heatmap-specific request types
// ──────────────────────────────────────────────

// CreateAllocationRequest is the payload for creating a capacity allocation via the heatmap API.
type CreateAllocationRequest struct {
	UserID        uuid.UUID `json:"userId" validate:"required"`
	ProjectID     uuid.UUID `json:"projectId" validate:"required"`
	AllocationPct float64   `json:"allocationPct" validate:"required"`
	PeriodStart   time.Time `json:"periodStart" validate:"required"`
	PeriodEnd     time.Time `json:"periodEnd" validate:"required"`
}

// UpdateAllocationRequest is the payload for partially updating a capacity allocation.
type UpdateAllocationRequest struct {
	AllocationPct *float64   `json:"allocationPct,omitempty"`
	PeriodStart   *time.Time `json:"periodStart,omitempty"`
	PeriodEnd     *time.Time `json:"periodEnd,omitempty"`
}

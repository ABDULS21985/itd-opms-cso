package planning

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Cost entry type constants
// ──────────────────────────────────────────────

const (
	EntryTypeActual    = "actual"
	EntryTypeCommitted = "committed"
	EntryTypeForecast  = "forecast"
)

// ──────────────────────────────────────────────
// Budget & cost domain types
// ──────────────────────────────────────────────

// CostCategory represents a hierarchical cost classification.
type CostCategory struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Code        *string    `json:"code"`
	ParentID    *uuid.UUID `json:"parentId"`
	IsActive    bool       `json:"isActive"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// CostEntry represents a single financial transaction against a project.
type CostEntry struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	ProjectID    uuid.UUID  `json:"projectId"`
	CategoryID   *uuid.UUID `json:"categoryId"`
	CategoryName string     `json:"categoryName,omitempty"`
	Description  string     `json:"description"`
	Amount       float64    `json:"amount"`
	EntryType    string     `json:"entryType"`
	EntryDate    time.Time  `json:"entryDate"`
	VendorName   *string    `json:"vendorName"`
	InvoiceRef   *string    `json:"invoiceRef"`
	DocumentID   *uuid.UUID `json:"documentId"`
	CreatedBy    uuid.UUID  `json:"createdBy"`
	CreatorName  string     `json:"creatorName,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

// BudgetSnapshot captures the financial state of a project at a point in time.
type BudgetSnapshot struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenantId"`
	ProjectID      uuid.UUID `json:"projectId"`
	SnapshotDate   time.Time `json:"snapshotDate"`
	ApprovedBudget float64   `json:"approvedBudget"`
	ActualSpend    float64   `json:"actualSpend"`
	CommittedSpend float64   `json:"committedSpend"`
	ForecastTotal  float64   `json:"forecastTotal"`
	CompletionPct  float64   `json:"completionPct"`
	Notes          *string   `json:"notes"`
	CreatedBy      uuid.UUID `json:"createdBy"`
	CreatorName    string    `json:"creatorName,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// BudgetSummary provides aggregated financial metrics for a project.
type BudgetSummary struct {
	ProjectID            uuid.UUID       `json:"projectId"`
	ApprovedBudget       float64         `json:"approvedBudget"`
	ActualSpend          float64         `json:"actualSpend"`
	CommittedSpend       float64         `json:"committedSpend"`
	ForecastTotal        float64         `json:"forecastTotal"`
	RemainingBudget      float64         `json:"remainingBudget"`
	VariancePct          float64         `json:"variancePct"`
	BurnRate             float64         `json:"burnRate"`
	MonthsRemaining      float64         `json:"monthsRemaining"`
	EstimatedAtCompletion float64        `json:"estimatedAtCompletion"`
	CostPerformanceIndex float64         `json:"costPerformanceIndex"`
	ByCategory           []CategorySpend `json:"byCategory"`
}

// CategorySpend breaks down spending by cost category.
type CategorySpend struct {
	CategoryID   uuid.UUID `json:"categoryId"`
	CategoryName string    `json:"categoryName"`
	Actual       float64   `json:"actual"`
	Committed    float64   `json:"committed"`
	Forecast     float64   `json:"forecast"`
}

// BurnRatePoint represents a single data point in the burn rate time series.
type BurnRatePoint struct {
	Period           string  `json:"period"`
	Actual           float64 `json:"actual"`
	Committed        float64 `json:"committed"`
	Forecast         float64 `json:"forecast"`
	CumulativeActual float64 `json:"cumulativeActual"`
	BudgetLine       float64 `json:"budgetLine"`
}

// BudgetForecast holds the estimated-at-completion projection.
type BudgetForecast struct {
	ProjectID            uuid.UUID       `json:"projectId"`
	ApprovedBudget       float64         `json:"approvedBudget"`
	ActualSpend          float64         `json:"actualSpend"`
	CompletionPct        float64         `json:"completionPct"`
	EstimatedAtCompletion float64        `json:"estimatedAtCompletion"`
	VarianceAtCompletion float64         `json:"varianceAtCompletion"`
	CostPerformanceIndex float64         `json:"costPerformanceIndex"`
	ForecastPoints       []BurnRatePoint `json:"forecastPoints"`
}

// PortfolioBudgetItem provides budget summary for a single project within a portfolio view.
type PortfolioBudgetItem struct {
	ProjectID       uuid.UUID `json:"projectId"`
	ProjectTitle    string    `json:"projectTitle"`
	ProjectCode     string    `json:"projectCode"`
	Status          string    `json:"status"`
	ApprovedBudget  float64   `json:"approvedBudget"`
	ActualSpend     float64   `json:"actualSpend"`
	CommittedSpend  float64   `json:"committedSpend"`
	RemainingBudget float64   `json:"remainingBudget"`
	VariancePct     float64   `json:"variancePct"`
}

// PortfolioBudgetSummary provides aggregate budget data across projects.
type PortfolioBudgetSummary struct {
	TotalApproved  float64               `json:"totalApproved"`
	TotalSpent     float64               `json:"totalSpent"`
	TotalCommitted float64               `json:"totalCommitted"`
	TotalRemaining float64               `json:"totalRemaining"`
	AvgVariance    float64               `json:"avgVariance"`
	Projects       []PortfolioBudgetItem `json:"projects"`
}

// ──────────────────────────────────────────────
// Budget request types
// ──────────────────────────────────────────────

// CreateCostEntryRequest is the payload for creating a new cost entry.
type CreateCostEntryRequest struct {
	CategoryID  *uuid.UUID `json:"categoryId"`
	Description string     `json:"description" validate:"required"`
	Amount      float64    `json:"amount" validate:"required"`
	EntryType   string     `json:"entryType" validate:"required"`
	EntryDate   *time.Time `json:"entryDate"`
	VendorName  *string    `json:"vendorName"`
	InvoiceRef  *string    `json:"invoiceRef"`
	DocumentID  *uuid.UUID `json:"documentId"`
}

// UpdateCostEntryRequest is the payload for updating an existing cost entry.
type UpdateCostEntryRequest struct {
	CategoryID  *uuid.UUID `json:"categoryId"`
	Description *string    `json:"description"`
	Amount      *float64   `json:"amount"`
	EntryType   *string    `json:"entryType"`
	EntryDate   *time.Time `json:"entryDate"`
	VendorName  *string    `json:"vendorName"`
	InvoiceRef  *string    `json:"invoiceRef"`
	DocumentID  *uuid.UUID `json:"documentId"`
}

// CreateCostCategoryRequest is the payload for creating a new cost category.
type CreateCostCategoryRequest struct {
	Name        string     `json:"name" validate:"required"`
	Description *string    `json:"description"`
	Code        *string    `json:"code"`
	ParentID    *uuid.UUID `json:"parentId"`
}

// UpdateCostCategoryRequest is the payload for updating an existing cost category.
type UpdateCostCategoryRequest struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	Code        *string    `json:"code"`
	ParentID    *uuid.UUID `json:"parentId"`
}

// CreateBudgetSnapshotRequest is the payload for creating a budget snapshot.
type CreateBudgetSnapshotRequest struct {
	Notes *string `json:"notes"`
}

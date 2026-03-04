package planning

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Import batch status constants
// ──────────────────────────────────────────────

const (
	ImportStatusPending    = "pending"
	ImportStatusValidating = "validating"
	ImportStatusValidated  = "validated"
	ImportStatusImporting  = "importing"
	ImportStatusCompleted  = "completed"
	ImportStatusFailed     = "failed"
	ImportStatusCancelled  = "cancelled"
)

// ──────────────────────────────────────────────
// Import batch domain types
// ──────────────────────────────────────────────

// ImportBatch represents a bulk project import batch.
type ImportBatch struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	UploadedBy   uuid.UUID  `json:"uploadedBy"`
	FileName     string     `json:"fileName"`
	FileFormat   string     `json:"fileFormat"`
	Status       string     `json:"status"`
	TotalRows    int        `json:"totalRows"`
	ValidRows    int        `json:"validRows"`
	InvalidRows  int        `json:"invalidRows"`
	ImportedRows int        `json:"importedRows"`
	FailedRows   int        `json:"failedRows"`
	CreatedAt    time.Time  `json:"createdAt"`
	CompletedAt  *time.Time `json:"completedAt"`
}

// ImportBatchError represents a validation or import error for a specific row.
type ImportBatchError struct {
	ID         uuid.UUID `json:"id"`
	BatchID    uuid.UUID `json:"batchId"`
	RowNumber  int       `json:"rowNumber"`
	ColumnName string    `json:"columnName,omitempty"`
	FieldValue string    `json:"fieldValue,omitempty"`
	ErrorCode  string    `json:"errorCode"`
	Message    string    `json:"message"`
}

// ──────────────────────────────────────────────
// Template column definitions
// ──────────────────────────────────────────────

// TemplateColumn defines a column in the import template.
type TemplateColumn struct {
	Header      string `json:"header"`
	Field       string `json:"field"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     string `json:"example"`
}

// ProjectTemplateColumns defines the standard import template columns.
// These map directly to the CreateProjectRequest fields plus lookup references.
var ProjectTemplateColumns = []TemplateColumn{
	{Header: "Project Title", Field: "title", Required: true, Description: "Unique project name", Example: "Core Banking Upgrade"},
	{Header: "Project Code", Field: "code", Required: true, Description: "Unique project code per tenant", Example: "PRJ-2026-001"},
	{Header: "Description", Field: "description", Required: false, Description: "Project description", Example: "Upgrade core banking system to v5"},
	{Header: "Portfolio Name", Field: "portfolioName", Required: false, Description: "Name of portfolio (must exist)", Example: "FY2026 IT Portfolio"},
	{Header: "Division Name", Field: "divisionName", Required: false, Description: "Name of division/org unit (must exist)", Example: "Information Technology"},
	{Header: "Sponsor Email", Field: "sponsorEmail", Required: false, Description: "Email of project sponsor (must exist as user)", Example: "sponsor@example.com"},
	{Header: "Project Manager Email", Field: "projectManagerEmail", Required: false, Description: "Email of project manager (must exist as user)", Example: "pm@example.com"},
	{Header: "Status", Field: "status", Required: false, Description: "Project status: proposed, approved, active, on_hold, completed, cancelled (default: proposed)", Example: "proposed"},
	{Header: "Priority", Field: "priority", Required: false, Description: "Priority: critical, high, medium, low (default: medium)", Example: "high"},
	{Header: "Planned Start Date", Field: "plannedStart", Required: false, Description: "Planned start date (YYYY-MM-DD)", Example: "2026-04-01"},
	{Header: "Planned End Date", Field: "plannedEnd", Required: false, Description: "Planned end date (YYYY-MM-DD)", Example: "2026-12-31"},
	{Header: "Budget Approved", Field: "budgetApproved", Required: false, Description: "Approved budget amount (numeric)", Example: "500000.00"},
	{Header: "Charter", Field: "charter", Required: false, Description: "Project charter text", Example: "Modernise the core banking platform to improve reliability"},
	{Header: "Scope", Field: "scope", Required: false, Description: "Scope statement", Example: "All production banking services and supporting infrastructure"},
	{Header: "Business Case", Field: "businessCase", Required: false, Description: "Business justification", Example: "Reduce downtime by 40% and improve transaction processing speed"},
}

// SampleRows provides additional example data rows for the import template.
// These rows demonstrate different valid combinations to help users understand expected input.
var SampleRows = [][]string{
	// Row 2 is auto-generated from ProjectTemplateColumns.Example above.
	// Row 3:
	{
		"Network Security Enhancement",
		"PRJ-2026-002",
		"Implement next-gen firewall and intrusion detection systems",
		"FY2026 IT Portfolio",
		"Information Technology",
		"sponsor@example.com",
		"pm@example.com",
		"approved",
		"critical",
		"2026-05-01",
		"2026-11-30",
		"2500000.00",
		"Strengthen perimeter and internal network security",
		"Network infrastructure across all offices",
		"Mitigate growing cyber threats and meet compliance requirements",
	},
	// Row 4:
	{
		"Staff Portal Redesign",
		"PRJ-2026-003",
		"Redesign the internal staff portal for improved usability",
		"",
		"",
		"",
		"",
		"proposed",
		"medium",
		"2026-07-01",
		"2027-03-31",
		"800000.00",
		"",
		"",
		"",
	},
}

// ──────────────────────────────────────────────
// Parsed row from uploaded file
// ──────────────────────────────────────────────

// ImportRow represents a single parsed row from the uploaded file.
type ImportRow struct {
	RowNumber           int     `json:"rowNumber"`
	Title               string  `json:"title"`
	Code                string  `json:"code"`
	Description         string  `json:"description"`
	PortfolioName       string  `json:"portfolioName"`
	DivisionName        string  `json:"divisionName"`
	SponsorEmail        string  `json:"sponsorEmail"`
	ProjectManagerEmail string  `json:"projectManagerEmail"`
	Status              string  `json:"status"`
	Priority            string  `json:"priority"`
	PlannedStart        string  `json:"plannedStart"`
	PlannedEnd          string  `json:"plannedEnd"`
	BudgetApproved      string  `json:"budgetApproved"`
	Charter             string  `json:"charter"`
	Scope               string  `json:"scope"`
	BusinessCase        string  `json:"businessCase"`
	IsValid             bool    `json:"isValid"`
	Errors              []RowError `json:"errors,omitempty"`
}

// RowError represents a single validation error within a row.
type RowError struct {
	Column  string `json:"column"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ──────────────────────────────────────────────
// API response types
// ──────────────────────────────────────────────

// ValidateImportResponse is returned after parsing and validating an uploaded file.
type ValidateImportResponse struct {
	BatchID     uuid.UUID   `json:"batchId"`
	FileName    string      `json:"fileName"`
	FileFormat  string      `json:"fileFormat"`
	TotalRows   int         `json:"totalRows"`
	ValidRows   int         `json:"validRows"`
	InvalidRows int         `json:"invalidRows"`
	Rows        []ImportRow `json:"rows"`
}

// CommitImportResponse is returned after executing the bulk import.
type CommitImportResponse struct {
	BatchID      uuid.UUID   `json:"batchId"`
	TotalRows    int         `json:"totalRows"`
	ImportedRows int         `json:"importedRows"`
	FailedRows   int         `json:"failedRows"`
	CreatedIDs   []uuid.UUID `json:"createdIds,omitempty"`
	Status       string      `json:"status"`
}

// ──────────────────────────────────────────────
// Allowed enum values (for validation)
// ──────────────────────────────────────────────

var validProjectStatuses = map[string]bool{
	"proposed":  true,
	"approved":  true,
	"active":    true,
	"on_hold":   true,
	"completed": true,
	"cancelled": true,
}

var validPriorities = map[string]bool{
	"critical": true,
	"high":     true,
	"medium":   true,
	"low":      true,
}

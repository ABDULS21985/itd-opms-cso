package grc

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Risk status constants
// ──────────────────────────────────────────────

const (
	RiskStatusIdentified = "identified"
	RiskStatusAssessed   = "assessed"
	RiskStatusMitigating = "mitigating"
	RiskStatusAccepted   = "accepted"
	RiskStatusClosed     = "closed"
	RiskStatusEscalated  = "escalated"
)

// ──────────────────────────────────────────────
// Risk likelihood constants
// ──────────────────────────────────────────────

const (
	LikelihoodVeryLow  = "very_low"
	LikelihoodLow      = "low"
	LikelihoodMedium   = "medium"
	LikelihoodHigh     = "high"
	LikelihoodVeryHigh = "very_high"
)

// ──────────────────────────────────────────────
// Risk impact constants
// ──────────────────────────────────────────────

const (
	ImpactVeryLow  = "very_low"
	ImpactLow      = "low"
	ImpactMedium   = "medium"
	ImpactHigh     = "high"
	ImpactVeryHigh = "very_high"
)

// ──────────────────────────────────────────────
// Risk category constants
// ──────────────────────────────────────────────

const (
	RiskCategoryOperational = "operational"
	RiskCategoryStrategic   = "strategic"
	RiskCategoryFinancial   = "financial"
	RiskCategoryCompliance  = "compliance"
	RiskCategoryTechnology  = "technology"
	RiskCategorySecurity    = "security"
	RiskCategoryReputation  = "reputation"
)

// ──────────────────────────────────────────────
// Audit type constants
// ──────────────────────────────────────────────

const (
	AuditTypeInternal   = "internal"
	AuditTypeExternal   = "external"
	AuditTypeRegulatory = "regulatory"
)

// ──────────────────────────────────────────────
// Audit status constants
// ──────────────────────────────────────────────

const (
	AuditStatusPlanned        = "planned"
	AuditStatusPreparing      = "preparing"
	AuditStatusInProgress     = "in_progress"
	AuditStatusFindingsReview = "findings_review"
	AuditStatusCompleted      = "completed"
)

// ──────────────────────────────────────────────
// Finding severity constants
// ──────────────────────────────────────────────

const (
	FindingSeverityLow      = "low"
	FindingSeverityMedium   = "medium"
	FindingSeverityHigh     = "high"
	FindingSeverityCritical = "critical"
)

// ──────────────────────────────────────────────
// Finding status constants
// ──────────────────────────────────────────────

const (
	FindingStatusOpen              = "open"
	FindingStatusRemediationPlanned = "remediation_planned"
	FindingStatusInRemediation     = "in_remediation"
	FindingStatusClosed            = "closed"
	FindingStatusAccepted          = "accepted"
)

// ──────────────────────────────────────────────
// Evidence collection status constants
// ──────────────────────────────────────────────

const (
	EvidenceStatusPending    = "pending"
	EvidenceStatusCollecting = "collecting"
	EvidenceStatusReview     = "review"
	EvidenceStatusApproved   = "approved"
	EvidenceStatusSubmitted  = "submitted"
)

// ──────────────────────────────────────────────
// Access review campaign status constants
// ──────────────────────────────────────────────

const (
	AccessReviewStatusPlanned   = "planned"
	AccessReviewStatusActive    = "active"
	AccessReviewStatusReview    = "review"
	AccessReviewStatusCompleted = "completed"
)

// ──────────────────────────────────────────────
// Access review decision constants
// ──────────────────────────────────────────────

const (
	ReviewDecisionApproved  = "approved"
	ReviewDecisionRevoked   = "revoked"
	ReviewDecisionException = "exception"
)

// ──────────────────────────────────────────────
// Compliance implementation status constants
// ──────────────────────────────────────────────

const (
	ComplianceStatusNotStarted  = "not_started"
	ComplianceStatusPartial     = "partial"
	ComplianceStatusImplemented = "implemented"
	ComplianceStatusVerified    = "verified"
)

// ──────────────────────────────────────────────
// Compliance framework constants
// ──────────────────────────────────────────────

const (
	FrameworkISO27001  = "ISO_27001"
	FrameworkNIST      = "NIST_CSF"
	FrameworkCOBIT     = "COBIT"
	FrameworkPCIDSS    = "PCI_DSS"
	FrameworkSOC2      = "SOC2"
	FrameworkNDPR      = "NDPR"
	FrameworkCBNGuidelines = "CBN_IT_GUIDELINES"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// Risk represents a risk entry in the risk register.
type Risk struct {
	ID                  uuid.UUID  `json:"id"`
	TenantID            uuid.UUID  `json:"tenantId"`
	RiskNumber          string     `json:"riskNumber"`
	Title               string     `json:"title"`
	Description         *string    `json:"description"`
	Category            string     `json:"category"`
	Likelihood          string     `json:"likelihood"`
	Impact              string     `json:"impact"`
	RiskScore           int        `json:"riskScore"`
	Status              string     `json:"status"`
	TreatmentPlan       *string    `json:"treatmentPlan"`
	ContingencyPlan     *string    `json:"contingencyPlan"`
	OwnerID             *uuid.UUID `json:"ownerId"`
	ReviewerID          *uuid.UUID `json:"reviewerId"`
	ReviewDate          *time.Time `json:"reviewDate"`
	NextReviewDate      *time.Time `json:"nextReviewDate"`
	LinkedProjectID     *uuid.UUID `json:"linkedProjectId"`
	LinkedAuditID       *uuid.UUID `json:"linkedAuditId"`
	EscalationThreshold int        `json:"escalationThreshold"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// RiskAssessment records a point-in-time risk assessment.
type RiskAssessment struct {
	ID                 uuid.UUID   `json:"id"`
	RiskID             uuid.UUID   `json:"riskId"`
	AssessedBy         uuid.UUID   `json:"assessedBy"`
	AssessmentDate     time.Time   `json:"assessmentDate"`
	PreviousLikelihood *string     `json:"previousLikelihood"`
	PreviousImpact     *string     `json:"previousImpact"`
	NewLikelihood      string      `json:"newLikelihood"`
	NewImpact          string      `json:"newImpact"`
	Rationale          *string     `json:"rationale"`
	EvidenceRefs       []uuid.UUID `json:"evidenceRefs"`
	CreatedAt          time.Time   `json:"createdAt"`
}

// RiskHeatMapEntry represents a single cell in the risk heat map.
type RiskHeatMapEntry struct {
	Likelihood string `json:"likelihood"`
	Impact     string `json:"impact"`
	Count      int    `json:"count"`
}

// Audit represents an audit engagement (internal, external, or regulatory).
type Audit struct {
	ID                   uuid.UUID       `json:"id"`
	TenantID             uuid.UUID       `json:"tenantId"`
	Title                string          `json:"title"`
	AuditType            string          `json:"auditType"`
	Scope                *string         `json:"scope"`
	Auditor              *string         `json:"auditor"`
	AuditBody            *string         `json:"auditBody"`
	Status               string          `json:"status"`
	ScheduledStart       *time.Time      `json:"scheduledStart"`
	ScheduledEnd         *time.Time      `json:"scheduledEnd"`
	EvidenceRequirements json.RawMessage `json:"evidenceRequirements"`
	ReadinessScore       float64         `json:"readinessScore"`
	CreatedBy            uuid.UUID       `json:"createdBy"`
	CreatedAt            time.Time       `json:"createdAt"`
	UpdatedAt            time.Time       `json:"updatedAt"`
}

// AuditFinding represents a finding discovered during an audit.
type AuditFinding struct {
	ID                    uuid.UUID   `json:"id"`
	AuditID               uuid.UUID   `json:"auditId"`
	TenantID              uuid.UUID   `json:"tenantId"`
	FindingNumber         string      `json:"findingNumber"`
	Title                 string      `json:"title"`
	Description           *string     `json:"description"`
	Severity              string      `json:"severity"`
	Status                string      `json:"status"`
	RemediationPlan       *string     `json:"remediationPlan"`
	OwnerID               *uuid.UUID  `json:"ownerId"`
	DueDate               *time.Time  `json:"dueDate"`
	ClosedAt              *time.Time  `json:"closedAt"`
	EvidenceOfRemediation []uuid.UUID `json:"evidenceOfRemediation"`
	CreatedAt             time.Time   `json:"createdAt"`
	UpdatedAt             time.Time   `json:"updatedAt"`
}

// EvidenceCollection groups evidence artifacts for an audit.
type EvidenceCollection struct {
	ID              uuid.UUID   `json:"id"`
	AuditID         uuid.UUID   `json:"auditId"`
	TenantID        uuid.UUID   `json:"tenantId"`
	Title           string      `json:"title"`
	Description     *string     `json:"description"`
	Status          string      `json:"status"`
	EvidenceItemIDs []uuid.UUID `json:"evidenceItemIds"`
	CollectorID     *uuid.UUID  `json:"collectorId"`
	ReviewerID      *uuid.UUID  `json:"reviewerId"`
	ApprovedAt      *time.Time  `json:"approvedAt"`
	Checksum        *string     `json:"checksum"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

// AccessReviewCampaign represents a periodic user access review campaign.
type AccessReviewCampaign struct {
	ID             uuid.UUID   `json:"id"`
	TenantID       uuid.UUID   `json:"tenantId"`
	Title          string      `json:"title"`
	Scope          *string     `json:"scope"`
	Status         string      `json:"status"`
	ReviewerIDs    []uuid.UUID `json:"reviewerIds"`
	DueDate        *time.Time  `json:"dueDate"`
	CompletionRate float64     `json:"completionRate"`
	CreatedBy      uuid.UUID   `json:"createdBy"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
}

// AccessReviewEntry represents a single user-role access review decision.
type AccessReviewEntry struct {
	ID              uuid.UUID  `json:"id"`
	CampaignID      uuid.UUID  `json:"campaignId"`
	TenantID        uuid.UUID  `json:"tenantId"`
	UserID          uuid.UUID  `json:"userId"`
	RoleID          *uuid.UUID `json:"roleId"`
	ReviewerID      *uuid.UUID `json:"reviewerId"`
	Decision        *string    `json:"decision"`
	Justification   *string    `json:"justification"`
	ExceptionExpiry *time.Time `json:"exceptionExpiry"`
	DecidedAt       *time.Time `json:"decidedAt"`
	CreatedAt       time.Time  `json:"createdAt"`
}

// ComplianceControl represents a single control within a compliance framework.
type ComplianceControl struct {
	ID                   uuid.UUID   `json:"id"`
	TenantID             uuid.UUID   `json:"tenantId"`
	Framework            string      `json:"framework"`
	ControlID            string      `json:"controlId"`
	ControlName          string      `json:"controlName"`
	Description          *string     `json:"description"`
	ImplementationStatus string      `json:"implementationStatus"`
	EvidenceRefs         []uuid.UUID `json:"evidenceRefs"`
	OwnerID              *uuid.UUID  `json:"ownerId"`
	LastAssessedAt       *time.Time  `json:"lastAssessedAt"`
	CreatedAt            time.Time   `json:"createdAt"`
	UpdatedAt            time.Time   `json:"updatedAt"`
}

// ComplianceStats provides aggregate compliance metrics for a framework.
type ComplianceStats struct {
	Framework      string `json:"framework"`
	Total          int    `json:"total"`
	CompliantCount int    `json:"compliantCount"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateRiskRequest is the payload for creating a new risk entry.
type CreateRiskRequest struct {
	Title               string     `json:"title" validate:"required"`
	Description         *string    `json:"description"`
	Category            string     `json:"category" validate:"required"`
	Likelihood          string     `json:"likelihood" validate:"required"`
	Impact              string     `json:"impact" validate:"required"`
	Status              string     `json:"status" validate:"required"`
	TreatmentPlan       *string    `json:"treatmentPlan"`
	ContingencyPlan     *string    `json:"contingencyPlan"`
	OwnerID             *uuid.UUID `json:"ownerId"`
	ReviewerID          *uuid.UUID `json:"reviewerId"`
	ReviewDate          *time.Time `json:"reviewDate"`
	NextReviewDate      *time.Time `json:"nextReviewDate"`
	LinkedProjectID     *uuid.UUID `json:"linkedProjectId"`
	LinkedAuditID       *uuid.UUID `json:"linkedAuditId"`
	EscalationThreshold *int       `json:"escalationThreshold"`
}

// UpdateRiskRequest is the payload for updating an existing risk (partial update).
type UpdateRiskRequest struct {
	Title               *string    `json:"title"`
	Description         *string    `json:"description"`
	Category            *string    `json:"category"`
	Likelihood          *string    `json:"likelihood"`
	Impact              *string    `json:"impact"`
	Status              *string    `json:"status"`
	TreatmentPlan       *string    `json:"treatmentPlan"`
	ContingencyPlan     *string    `json:"contingencyPlan"`
	OwnerID             *uuid.UUID `json:"ownerId"`
	ReviewerID          *uuid.UUID `json:"reviewerId"`
	ReviewDate          *time.Time `json:"reviewDate"`
	NextReviewDate      *time.Time `json:"nextReviewDate"`
	LinkedProjectID     *uuid.UUID `json:"linkedProjectId"`
	LinkedAuditID       *uuid.UUID `json:"linkedAuditId"`
	EscalationThreshold *int       `json:"escalationThreshold"`
}

// CreateRiskAssessmentRequest is the payload for recording a risk assessment.
type CreateRiskAssessmentRequest struct {
	NewLikelihood string      `json:"newLikelihood" validate:"required"`
	NewImpact     string      `json:"newImpact" validate:"required"`
	Rationale     *string     `json:"rationale"`
	EvidenceRefs  []uuid.UUID `json:"evidenceRefs"`
}

// CreateAuditRequest is the payload for creating a new audit.
type CreateAuditRequest struct {
	Title                string          `json:"title" validate:"required"`
	AuditType            string          `json:"auditType" validate:"required"`
	Scope                *string         `json:"scope"`
	Auditor              *string         `json:"auditor"`
	AuditBody            *string         `json:"auditBody"`
	ScheduledStart       *time.Time      `json:"scheduledStart"`
	ScheduledEnd         *time.Time      `json:"scheduledEnd"`
	EvidenceRequirements json.RawMessage `json:"evidenceRequirements"`
}

// UpdateAuditRequest is the payload for updating an existing audit (partial update).
type UpdateAuditRequest struct {
	Title                *string         `json:"title"`
	AuditType            *string         `json:"auditType"`
	Scope                *string         `json:"scope"`
	Status               *string         `json:"status"`
	Auditor              *string         `json:"auditor"`
	AuditBody            *string         `json:"auditBody"`
	ScheduledStart       *time.Time      `json:"scheduledStart"`
	ScheduledEnd         *time.Time      `json:"scheduledEnd"`
	EvidenceRequirements json.RawMessage `json:"evidenceRequirements"`
	ReadinessScore       *float64        `json:"readinessScore"`
}

// CreateAuditFindingRequest is the payload for creating an audit finding.
type CreateAuditFindingRequest struct {
	Title           string     `json:"title" validate:"required"`
	Description     *string    `json:"description"`
	Severity        string     `json:"severity" validate:"required"`
	RemediationPlan *string    `json:"remediationPlan"`
	OwnerID         *uuid.UUID `json:"ownerId"`
	DueDate         *time.Time `json:"dueDate"`
}

// UpdateAuditFindingRequest is the payload for updating an audit finding (partial update).
type UpdateAuditFindingRequest struct {
	Title           *string    `json:"title"`
	Description     *string    `json:"description"`
	Severity        *string    `json:"severity"`
	Status          *string    `json:"status"`
	RemediationPlan *string    `json:"remediationPlan"`
	OwnerID         *uuid.UUID `json:"ownerId"`
	DueDate         *time.Time `json:"dueDate"`
}

// CreateEvidenceCollectionRequest is the payload for creating an evidence collection.
type CreateEvidenceCollectionRequest struct {
	Title           string      `json:"title" validate:"required"`
	Description     *string     `json:"description"`
	EvidenceItemIDs []uuid.UUID `json:"evidenceItemIds"`
	CollectorID     *uuid.UUID  `json:"collectorId"`
}

// UpdateEvidenceCollectionRequest is the payload for updating an evidence collection (partial update).
type UpdateEvidenceCollectionRequest struct {
	Title           *string     `json:"title"`
	Description     *string     `json:"description"`
	Status          *string     `json:"status"`
	EvidenceItemIDs []uuid.UUID `json:"evidenceItemIds"`
	CollectorID     *uuid.UUID  `json:"collectorId"`
	ReviewerID      *uuid.UUID  `json:"reviewerId"`
	Checksum        *string     `json:"checksum"`
}

// CreateAccessReviewCampaignRequest is the payload for creating an access review campaign.
type CreateAccessReviewCampaignRequest struct {
	Title       string      `json:"title" validate:"required"`
	Scope       *string     `json:"scope"`
	ReviewerIDs []uuid.UUID `json:"reviewerIds"`
	DueDate     *time.Time  `json:"dueDate"`
}

// UpdateAccessReviewCampaignRequest is the payload for updating an access review campaign (partial update).
type UpdateAccessReviewCampaignRequest struct {
	Title       *string     `json:"title"`
	Scope       *string     `json:"scope"`
	Status      *string     `json:"status"`
	ReviewerIDs []uuid.UUID `json:"reviewerIds"`
	DueDate     *time.Time  `json:"dueDate"`
}

// CreateAccessReviewEntryRequest is the payload for creating an access review entry.
type CreateAccessReviewEntryRequest struct {
	UserID uuid.UUID  `json:"userId" validate:"required"`
	RoleID *uuid.UUID `json:"roleId"`
}

// RecordDecisionRequest is the payload for recording an access review decision.
type RecordDecisionRequest struct {
	Decision        string     `json:"decision" validate:"required"`
	Justification   *string    `json:"justification"`
	ExceptionExpiry *time.Time `json:"exceptionExpiry"`
}

// CreateComplianceControlRequest is the payload for creating a compliance control.
type CreateComplianceControlRequest struct {
	Framework   string     `json:"framework" validate:"required"`
	ControlID   string     `json:"controlId" validate:"required"`
	ControlName string     `json:"controlName" validate:"required"`
	Description *string    `json:"description"`
	OwnerID     *uuid.UUID `json:"ownerId"`
}

// UpdateComplianceControlRequest is the payload for updating a compliance control (partial update).
type UpdateComplianceControlRequest struct {
	ControlName          *string     `json:"controlName"`
	Description          *string     `json:"description"`
	ImplementationStatus *string     `json:"implementationStatus"`
	EvidenceRefs         []uuid.UUID `json:"evidenceRefs"`
	OwnerID              *uuid.UUID  `json:"ownerId"`
}

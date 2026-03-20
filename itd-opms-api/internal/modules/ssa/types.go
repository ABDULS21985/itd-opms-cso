package ssa

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Workflow state constants
// ──────────────────────────────────────────────

const (
	StatusDraft          = "DRAFT"
	StatusSubmitted      = "SUBMITTED"
	StatusHOOEndorsed    = "HOO_ENDORSED"
	StatusASDAssessed    = "ASD_ASSESSED"
	StatusQCMDAnalysed   = "QCMD_ANALYSED"
	StatusApprDCPending  = "APPR_DC_PENDING"
	StatusApprSSOPending = "APPR_SSO_PENDING"
	StatusApprIMDPending = "APPR_IMD_PENDING"
	StatusApprASDPending = "APPR_ASD_PENDING"
	StatusApprSCAOPending = "APPR_SCAO_PENDING"
	StatusFullyApproved  = "FULLY_APPROVED"
	StatusSANProvisioned = "SAN_PROVISIONED"
	StatusDCOCreated     = "DCO_CREATED"
	StatusRejected       = "REJECTED"
	StatusCancelled      = "CANCELLED"
)

// ──────────────────────────────────────────────
// Risk category constants
// ──────────────────────────────────────────────

const (
	RiskCategoryAuthentication = "AUTHENTICATION"
	RiskCategoryAvailability   = "AVAILABILITY"
	RiskCategoryPerformance    = "PERFORMANCE"
	RiskCategoryDataIntegrity  = "DATA_INTEGRITY"
)

// ──────────────────────────────────────────────
// Severity constants
// ──────────────────────────────────────────────

const (
	SeverityCritical = "CRITICAL"
	SeverityHigh     = "HIGH"
	SeverityMedium   = "MEDIUM"
	SeverityLow      = "LOW"
)

// ──────────────────────────────────────────────
// Assessment outcome constants
// ──────────────────────────────────────────────

const (
	OutcomeFeasible              = "FEASIBLE"
	OutcomeConditionallyFeasible = "CONDITIONALLY_FEASIBLE"
	OutcomeNotFeasible           = "NOT_FEASIBLE"
)

// ──────────────────────────────────────────────
// Decision constants
// ──────────────────────────────────────────────

const (
	DecisionApproved = "APPROVED"
	DecisionRejected = "REJECTED"
	DecisionReturned = "RETURNED"
)

// ──────────────────────────────────────────────
// Audit event type constants
// ──────────────────────────────────────────────

const (
	EventStateChange  = "STATE_CHANGE"
	EventDataEdit     = "DATA_EDIT"
	EventNotification = "NOTIFICATION"
	EventSLABreach    = "SLA_BREACH"
	EventEscalation   = "ESCALATION"
)

// ──────────────────────────────────────────────
// Approval stage constants (sequential chain)
// ──────────────────────────────────────────────

const (
	StageHOOEndorsement = "HOO_ENDORSEMENT"
	StageASDAssessment  = "ASD_ASSESSMENT"
	StageQCMDAnalysis   = "QCMD_ANALYSIS"
	StageApprDC         = "APPR_DC"
	StageApprSSO        = "APPR_SSO"
	StageApprIMD        = "APPR_IMD"
	StageApprASD        = "APPR_ASD"
	StageApprSCAO       = "APPR_SCAO"
	StageSANProvisioning = "SAN_PROVISIONING"
	StageDCOServer      = "DCO_SERVER"
)

// approvalStageToNextStatus maps the current approval stage to the next request status on approval.
var approvalStageToNextStatus = map[string]string{
	StageApprDC:   StatusApprSSOPending,
	StageApprSSO:  StatusApprIMDPending,
	StageApprIMD:  StatusApprASDPending,
	StageApprASD:  StatusApprSCAOPending,
	StageApprSCAO: StatusFullyApproved,
}

// statusToApprovalStage maps request status to the approval stage expected.
var statusToApprovalStage = map[string]string{
	StatusApprDCPending:   StageApprDC,
	StatusApprSSOPending:  StageApprSSO,
	StatusApprIMDPending:  StageApprIMD,
	StatusApprASDPending:  StageApprASD,
	StatusApprSCAOPending: StageApprSCAO,
}

// SLA targets in business hours per stage.
var slaHoursByStage = map[string]int{
	StageHOOEndorsement:  8,
	StageASDAssessment:   16,
	StageQCMDAnalysis:    16,
	StageApprDC:          8,
	StageApprSSO:         8,
	StageApprIMD:         8,
	StageApprASD:         8,
	StageApprSCAO:        8,
	StageSANProvisioning: 24,
	StageDCOServer:       24,
}

// ──────────────────────────────────────────────
// Domain models
// ──────────────────────────────────────────────

// SSARequest is the primary request entity.
type SSARequest struct {
	ID                     uuid.UUID  `json:"id"`
	TenantID               uuid.UUID  `json:"tenantId"`
	ReferenceNo            string     `json:"referenceNo"`
	RequestorID            uuid.UUID  `json:"requestorId"`
	RequestorName          string     `json:"requestorName"`
	RequestorStaffID       string     `json:"requestorStaffId"`
	RequestorEmail         string     `json:"requestorEmail"`
	RequestorStatus        *string    `json:"requestorStatus"`
	DivisionOffice         string     `json:"divisionOffice"`
	Status                 string     `json:"status"`
	Extension              *string    `json:"extension"`
	AppName                string     `json:"appName"`
	DBName                 string     `json:"dbName"`
	OperatingSystem        string     `json:"operatingSystem"`
	ServerType             string     `json:"serverType"`
	VCPUCount              int        `json:"vcpuCount"`
	MemoryGB               int        `json:"memoryGb"`
	DiskCount              *int       `json:"diskCount"`
	SpaceGB                int        `json:"spaceGb"`
	VLANZone               string     `json:"vlanZone"`
	SpecialRequirements    *string    `json:"specialRequirements"`
	Justification          string     `json:"justification"`
	PresentSpaceAllocated  int        `json:"presentSpaceAllocatedGb"`
	PresentSpaceInUse      int        `json:"presentSpaceInUseGb"`
	RevisionCount          int        `json:"revisionCount"`
	RejectedStage          *string    `json:"rejectedStage"`
	SubmittedAt            *time.Time `json:"submittedAt"`
	CompletedAt            *time.Time `json:"completedAt"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              time.Time  `json:"updatedAt"`
}

// ServiceImpact captures a risk narrative for the SIA section.
type ServiceImpact struct {
	ID                 uuid.UUID `json:"id"`
	RequestID          uuid.UUID `json:"requestId"`
	RiskCategory       string    `json:"riskCategory"`
	RiskDescription    string    `json:"riskDescription"`
	MitigationMeasures string    `json:"mitigationMeasures"`
	Severity           string    `json:"severity"`
	SequenceOrder      int       `json:"sequenceOrder"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// Approval records an approval or rejection action.
type Approval struct {
	ID              uuid.UUID  `json:"id"`
	RequestID       uuid.UUID  `json:"requestId"`
	Stage           string     `json:"stage"`
	ApproverID      uuid.UUID  `json:"approverId"`
	ApproverName    string     `json:"approverName"`
	ApproverRole    string     `json:"approverRole"`
	Decision        string     `json:"decision"`
	Remarks         *string    `json:"remarks"`
	DecidedAt       time.Time  `json:"decidedAt"`
	DelegatedFromID *uuid.UUID `json:"delegatedFromId"`
	SLATargetAt     time.Time  `json:"slaTargetAt"`
	SLABreached     bool       `json:"slaBreached"`
	CreatedAt       time.Time  `json:"createdAt"`
}

// ASDAssessment is the technical feasibility assessment.
type ASDAssessment struct {
	ID                      uuid.UUID `json:"id"`
	RequestID               uuid.UUID `json:"requestId"`
	AssessorID              uuid.UUID `json:"assessorId"`
	AssessmentOutcome       string    `json:"assessmentOutcome"`
	OSCompatibilityCheck    bool      `json:"osCompatibilityCheck"`
	ResourceAdequacyCheck   bool      `json:"resourceAdequacyCheck"`
	SecurityComplianceCheck bool      `json:"securityComplianceCheck"`
	HAFeasibilityCheck      bool      `json:"haFeasibilityCheck"`
	Conditions              *string   `json:"conditions"`
	TechnicalNotes          *string   `json:"technicalNotes"`
	AssessedAt              time.Time `json:"assessedAt"`
}

// QCMDAnalysis is the capacity analysis and server assignment.
type QCMDAnalysis struct {
	ID                       uuid.UUID `json:"id"`
	RequestID                uuid.UUID `json:"requestId"`
	AnalystID                uuid.UUID `json:"analystId"`
	ServerReference          string    `json:"serverReference"`
	AvailableStorageTB       float64   `json:"availableStorageTb"`
	SpaceRequestedGB         int       `json:"spaceRequestedGb"`
	StorageAfterAllocationTB float64   `json:"storageAfterAllocationTb"`
	JustificationNotes       *string   `json:"justificationNotes"`
	AnalysedAt               time.Time `json:"analysedAt"`
}

// SANProvisioning captures SAN parameters.
type SANProvisioning struct {
	ID                uuid.UUID  `json:"id"`
	RequestID         uuid.UUID  `json:"requestId"`
	AdministratorID   uuid.UUID  `json:"administratorId"`
	Port              string     `json:"port"`
	CU                string     `json:"cu"`
	LDEV              string     `json:"ldev"`
	LUN               string     `json:"lun"`
	ACP               string     `json:"acp"`
	SizeAllocated     string     `json:"sizeAllocated"`
	HBAType           *string    `json:"hbaType"`
	HBADriverVersion  *string    `json:"hbaDriverVersion"`
	WWNNo             *string    `json:"wwnNo"`
	HostName          *string    `json:"hostName"`
	SANSwitchNoPort   *string    `json:"sanSwitchNoPort"`
	SANSwitchZoneName *string    `json:"sanSwitchZoneName"`
	Remarks           *string    `json:"remarks"`
	ProvisionedAt     time.Time  `json:"provisionedAt"`
}

// DCOServer is the server creation record.
type DCOServer struct {
	ID              uuid.UUID `json:"id"`
	RequestID       uuid.UUID `json:"requestId"`
	CreatorID       uuid.UUID `json:"creatorId"`
	CreatorName     string    `json:"creatorName"`
	CreatorStaffID  string    `json:"creatorStaffId"`
	ServerName      string    `json:"serverName"`
	IPAddress       string    `json:"ipAddress"`
	Zone            string    `json:"zone"`
	CreatedServerAt time.Time `json:"createdServerAt"`
}

// SSAAuditLog is an immutable audit entry.
type SSAAuditLog struct {
	ID           int64           `json:"id"`
	RequestID    uuid.UUID       `json:"requestId"`
	EventType    string          `json:"eventType"`
	FromState    *string         `json:"fromState"`
	ToState      *string         `json:"toState"`
	ActorID      uuid.UUID       `json:"actorId"`
	ActorName    string          `json:"actorName"`
	Description  string          `json:"description"`
	MetadataJSON json.RawMessage `json:"metadataJson"`
	IPAddress    *string         `json:"ipAddress"`
	OccurredAt   time.Time       `json:"occurredAt"`
}

// Delegation manages temporary approval delegation.
type Delegation struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	DelegatorID   uuid.UUID `json:"delegatorId"`
	DelegateID    uuid.UUID `json:"delegateId"`
	Stage         string    `json:"stage"`
	EffectiveFrom time.Time `json:"effectiveFrom"`
	EffectiveTo   time.Time `json:"effectiveTo"`
	IsActive      bool      `json:"isActive"`
	Reason        *string   `json:"reason"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Composite response types
// ──────────────────────────────────────────────

// RequestDetail is the full nested response for a single request.
type RequestDetail struct {
	SSARequest
	ServiceImpacts []ServiceImpact  `json:"serviceImpacts"`
	Approvals      []Approval       `json:"approvals"`
	ASDAssessment  *ASDAssessment   `json:"asdAssessment"`
	QCMDAnalysis   *QCMDAnalysis    `json:"qcmdAnalysis"`
	SANProvisioning *SANProvisioning `json:"sanProvisioning"`
	DCOServer      *DCOServer       `json:"dcoServer"`
}

// RequestStats holds dashboard statistics.
type RequestStats struct {
	Total      int64 `json:"total"`
	Draft      int64 `json:"draft"`
	Submitted  int64 `json:"submitted"`
	InProgress int64 `json:"inProgress"`
	Approved   int64 `json:"approved"`
	Rejected   int64 `json:"rejected"`
	Completed  int64 `json:"completed"`
	Cancelled  int64 `json:"cancelled"`
}

// ──────────────────────────────────────────────
// Request DTOs
// ──────────────────────────────────────────────

// CreateRequestDTO is the input for creating a new SSA request.
type CreateRequestDTO struct {
	DivisionOffice        string  `json:"divisionOffice" validate:"required"`
	RequestorStatus       *string `json:"requestorStatus"`
	Extension             *string `json:"extension"`
	AppName               string  `json:"appName" validate:"required"`
	DBName                string  `json:"dbName" validate:"required"`
	OperatingSystem       string  `json:"operatingSystem" validate:"required"`
	ServerType            string  `json:"serverType" validate:"required"`
	VCPUCount             int     `json:"vcpuCount" validate:"required"`
	MemoryGB              int     `json:"memoryGb" validate:"required"`
	DiskCount             *int    `json:"diskCount"`
	SpaceGB               int     `json:"spaceGb" validate:"required"`
	VLANZone              string  `json:"vlanZone" validate:"required"`
	SpecialRequirements   *string `json:"specialRequirements"`
	Justification         string  `json:"justification" validate:"required"`
	PresentSpaceAllocated int     `json:"presentSpaceAllocatedGb"`
	PresentSpaceInUse     int     `json:"presentSpaceInUseGb"`
}

// UpdateRequestDTO is the input for updating a draft request.
type UpdateRequestDTO struct {
	DivisionOffice        *string `json:"divisionOffice"`
	RequestorStatus       *string `json:"requestorStatus"`
	Extension             *string `json:"extension"`
	AppName               *string `json:"appName"`
	DBName                *string `json:"dbName"`
	OperatingSystem       *string `json:"operatingSystem"`
	ServerType            *string `json:"serverType"`
	VCPUCount             *int    `json:"vcpuCount"`
	MemoryGB              *int    `json:"memoryGb"`
	DiskCount             *int    `json:"diskCount"`
	SpaceGB               *int    `json:"spaceGb"`
	VLANZone              *string `json:"vlanZone"`
	SpecialRequirements   *string `json:"specialRequirements"`
	Justification         *string `json:"justification"`
	PresentSpaceAllocated *int    `json:"presentSpaceAllocatedGb"`
	PresentSpaceInUse     *int    `json:"presentSpaceInUseGb"`
}

// CreateServiceImpactDTO is the input for adding an SIA entry.
type CreateServiceImpactDTO struct {
	RiskCategory       string `json:"riskCategory" validate:"required"`
	RiskDescription    string `json:"riskDescription" validate:"required"`
	MitigationMeasures string `json:"mitigationMeasures" validate:"required"`
	Severity           string `json:"severity" validate:"required"`
	SequenceOrder      int    `json:"sequenceOrder"`
}

// EndorsementDTO is the input for HOO endorsement/rejection.
type EndorsementDTO struct {
	Decision string  `json:"decision" validate:"required"`
	Remarks  *string `json:"remarks"`
}

// ASDAssessmentDTO is the input for submitting an ASD assessment.
type ASDAssessmentDTO struct {
	AssessmentOutcome       string  `json:"assessmentOutcome" validate:"required"`
	OSCompatibilityCheck    bool    `json:"osCompatibilityCheck"`
	ResourceAdequacyCheck   bool    `json:"resourceAdequacyCheck"`
	SecurityComplianceCheck bool    `json:"securityComplianceCheck"`
	HAFeasibilityCheck      bool    `json:"haFeasibilityCheck"`
	Conditions              *string `json:"conditions"`
	TechnicalNotes          *string `json:"technicalNotes"`
}

// QCMDAnalysisDTO is the input for submitting a QCMD analysis.
type QCMDAnalysisDTO struct {
	ServerReference          string  `json:"serverReference" validate:"required"`
	AvailableStorageTB       float64 `json:"availableStorageTb" validate:"required"`
	SpaceRequestedGB         int     `json:"spaceRequestedGb" validate:"required"`
	StorageAfterAllocationTB float64 `json:"storageAfterAllocationTb" validate:"required"`
	JustificationNotes       *string `json:"justificationNotes"`
}

// ApprovalDTO is the input for an approval tier action.
type ApprovalDTO struct {
	Decision string  `json:"decision" validate:"required"`
	Remarks  *string `json:"remarks"`
}

// SANProvisioningDTO is the input for submitting SAN provisioning.
type SANProvisioningDTO struct {
	Port              string  `json:"port" validate:"required"`
	CU                string  `json:"cu" validate:"required"`
	LDEV              string  `json:"ldev" validate:"required"`
	LUN               string  `json:"lun" validate:"required"`
	ACP               string  `json:"acp" validate:"required"`
	SizeAllocated     string  `json:"sizeAllocated" validate:"required"`
	HBAType           *string `json:"hbaType"`
	HBADriverVersion  *string `json:"hbaDriverVersion"`
	WWNNo             *string `json:"wwnNo"`
	HostName          *string `json:"hostName"`
	SANSwitchNoPort   *string `json:"sanSwitchNoPort"`
	SANSwitchZoneName *string `json:"sanSwitchZoneName"`
	Remarks           *string `json:"remarks"`
}

// DCOServerDTO is the input for submitting DCO server creation.
type DCOServerDTO struct {
	ServerName string `json:"serverName" validate:"required"`
	IPAddress  string `json:"ipAddress" validate:"required"`
	Zone       string `json:"zone" validate:"required"`
}

// CancelRequestDTO is the optional input for cancelling a request.
type CancelRequestDTO struct {
	Reason *string `json:"reason"`
}

// CreateDelegationDTO is the input for creating a delegation.
type CreateDelegationDTO struct {
	DelegateID    uuid.UUID `json:"delegateId" validate:"required"`
	Stage         string    `json:"stage" validate:"required"`
	EffectiveFrom time.Time `json:"effectiveFrom" validate:"required"`
	EffectiveTo   time.Time `json:"effectiveTo" validate:"required"`
	Reason        *string   `json:"reason"`
}

// ──────────────────────────────────────────────
// Bulk operation DTOs
// ──────────────────────────────────────────────

// BulkApproveDTO is the input for bulk-approving requests at a given stage.
type BulkApproveDTO struct {
	RequestIDs []uuid.UUID `json:"requestIds" validate:"required,min=1"`
	Remarks    *string     `json:"remarks"`
}

// BulkStatusUpdateDTO is the input for bulk status transitions.
type BulkStatusUpdateDTO struct {
	RequestIDs []uuid.UUID `json:"requestIds" validate:"required,min=1"`
	FromStatus string      `json:"fromStatus" validate:"required"`
	ToStatus   string      `json:"toStatus" validate:"required"`
	Reason     *string     `json:"reason"`
}

// BulkExportFilter specifies filters for exporting requests.
type BulkExportFilter struct {
	Status   *string    `json:"status"`
	Division *string    `json:"division"`
	FromDate *time.Time `json:"fromDate"`
	ToDate   *time.Time `json:"toDate"`
}

// BulkOperationResult captures the outcome for a single request within a bulk operation.
type BulkOperationResult struct {
	RequestID uuid.UUID `json:"requestId"`
	Success   bool      `json:"success"`
	Error     string    `json:"error,omitempty"`
}

// BulkOperationSummary summarises the outcome of a bulk operation.
type BulkOperationSummary struct {
	TotalRequested int                   `json:"totalRequested"`
	Succeeded      int                   `json:"succeeded"`
	Failed         int                   `json:"failed"`
	Results        []BulkOperationResult `json:"results"`
}

// ExportedRequest is a denormalised view of a request for export purposes.
type ExportedRequest struct {
	SSARequest
	ServiceImpacts  []ServiceImpact  `json:"serviceImpacts"`
	Approvals       []Approval       `json:"approvals"`
	ASDAssessment   *ASDAssessment   `json:"asdAssessment"`
	QCMDAnalysis    *QCMDAnalysis    `json:"qcmdAnalysis"`
	SANProvisioning *SANProvisioning `json:"sanProvisioning"`
	DCOServer       *DCOServer       `json:"dcoServer"`
}

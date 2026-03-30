package cmdb

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Asset type constants
// ──────────────────────────────────────────────

const (
	AssetTypeHardware   = "hardware"
	AssetTypeSoftware   = "software"
	AssetTypeVirtual    = "virtual"
	AssetTypeCloud      = "cloud"
	AssetTypeNetwork    = "network"
	AssetTypePeripheral = "peripheral"
)

// ──────────────────────────────────────────────
// Asset status constants
// ──────────────────────────────────────────────

const (
	AssetStatusProcured    = "procured"
	AssetStatusReceived    = "received"
	AssetStatusActive      = "active"
	AssetStatusMaintenance = "maintenance"
	AssetStatusRetired     = "retired"
	AssetStatusDisposed    = "disposed"
)

// ──────────────────────────────────────────────
// Lifecycle event type constants
// ──────────────────────────────────────────────

const (
	LifecycleEventProcured         = "procured"
	LifecycleEventReceived         = "received"
	LifecycleEventDeployed         = "deployed"
	LifecycleEventTransferred      = "transferred"
	LifecycleEventMaintenanceStart = "maintenance_start"
	LifecycleEventMaintenanceEnd   = "maintenance_end"
	LifecycleEventRetired          = "retired"
	LifecycleEventDisposed         = "disposed"
)

// ──────────────────────────────────────────────
// Disposal method constants
// ──────────────────────────────────────────────

const (
	DisposalMethodResale      = "resale"
	DisposalMethodDonation    = "donation"
	DisposalMethodRecycling   = "recycling"
	DisposalMethodDestruction = "destruction"
)

// ──────────────────────────────────────────────
// Disposal status constants
// ──────────────────────────────────────────────

const (
	DisposalStatusPendingApproval = "pending_approval"
	DisposalStatusApproved        = "approved"
	DisposalStatusCompleted       = "completed"
	DisposalStatusCancelled       = "cancelled"
)

// ──────────────────────────────────────────────
// CI status constants
// ──────────────────────────────────────────────

const (
	CIStatusActive         = "active"
	CIStatusInactive       = "inactive"
	CIStatusPlanned        = "planned"
	CIStatusDecommissioned = "decommissioned"
)

// ──────────────────────────────────────────────
// CI relationship type constants
// ──────────────────────────────────────────────

const (
	CIRelationshipRunsOn      = "runs_on"
	CIRelationshipDependsOn   = "depends_on"
	CIRelationshipConnectedTo = "connected_to"
	CIRelationshipManagedBy   = "managed_by"
	CIRelationshipContains    = "contains"
	CIRelationshipUses        = "uses"
)

// ──────────────────────────────────────────────
// License type constants
// ──────────────────────────────────────────────

const (
	LicenseTypePerpetual    = "perpetual"
	LicenseTypeSubscription = "subscription"
	LicenseTypePerUser      = "per_user"
	LicenseTypePerDevice    = "per_device"
	LicenseTypeSite         = "site"
)

// ──────────────────────────────────────────────
// Compliance status constants
// ──────────────────────────────────────────────

const (
	ComplianceStatusCompliant     = "compliant"
	ComplianceStatusOverDeployed  = "over_deployed"
	ComplianceStatusUnderUtilized = "under_utilized"
)

// ──────────────────────────────────────────────
// Warranty renewal status constants
// ──────────────────────────────────────────────

const (
	WarrantyRenewalStatusActive       = "active"
	WarrantyRenewalStatusExpiringSoon = "expiring_soon"
	WarrantyRenewalStatusExpired      = "expired"
	WarrantyRenewalStatusRenewed      = "renewed"
)

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// Asset represents a tracked IT asset (hardware, software, virtual, cloud, network, peripheral).
type Asset struct {
	ID             uuid.UUID       `json:"id"`
	TenantID       uuid.UUID       `json:"tenantId"`
	AssetTag       string          `json:"assetTag"`
	Type           string          `json:"type"`
	Category       *string         `json:"category"`
	Name           string          `json:"name"`
	Description    *string         `json:"description"`
	Manufacturer   *string         `json:"manufacturer"`
	Model          *string         `json:"model"`
	SerialNumber   *string         `json:"serialNumber"`
	Status         string          `json:"status"`
	Location       *string         `json:"location"`
	Building       *string         `json:"building"`
	Floor          *string         `json:"floor"`
	Room           *string         `json:"room"`
	OwnerID        *uuid.UUID      `json:"ownerId"`
	CustodianID    *uuid.UUID      `json:"custodianId"`
	PurchaseDate   *time.Time      `json:"purchaseDate"`
	PurchaseCost   *float64        `json:"purchaseCost"`
	Currency       *string         `json:"currency"`
	Classification *string         `json:"classification"`
	Attributes     json.RawMessage `json:"attributes"`
	Tags           []string        `json:"tags"`
	LastVerifiedAt *time.Time      `json:"lastVerifiedAt"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

// AssetLifecycleEvent records a lifecycle transition for an asset.
type AssetLifecycleEvent struct {
	ID                 uuid.UUID       `json:"id"`
	AssetID            uuid.UUID       `json:"assetId"`
	TenantID           uuid.UUID       `json:"tenantId"`
	EventType          string          `json:"eventType"`
	PerformedBy        uuid.UUID       `json:"performedBy"`
	Details            json.RawMessage `json:"details"`
	EvidenceDocumentID *uuid.UUID      `json:"evidenceDocumentId"`
	CreatedAt          time.Time       `json:"createdAt"`
}

// AssetDisposal tracks the disposal workflow for a retired asset.
type AssetDisposal struct {
	ID                       uuid.UUID   `json:"id"`
	AssetID                  uuid.UUID   `json:"assetId"`
	TenantID                 uuid.UUID   `json:"tenantId"`
	DisposalMethod           string      `json:"disposalMethod"`
	Reason                   *string     `json:"reason"`
	ApprovedBy               *uuid.UUID  `json:"approvedBy"`
	ApprovalChainID          *uuid.UUID  `json:"approvalChainId"`
	DisposalDate             *time.Time  `json:"disposalDate"`
	DisposalCertificateDocID *uuid.UUID  `json:"disposalCertificateDocId"`
	WitnessIDs               []uuid.UUID `json:"witnessIds"`
	DataWipeConfirmed        bool        `json:"dataWipeConfirmed"`
	Status                   string      `json:"status"`
	CreatedAt                time.Time   `json:"createdAt"`
	UpdatedAt                time.Time   `json:"updatedAt"`
}

// AssetVerification records a physical verification of an asset.
type AssetVerification struct {
	ID                uuid.UUID   `json:"id"`
	TenantID          uuid.UUID   `json:"tenantId"`
	AssetID           uuid.UUID   `json:"assetId"`
	VerifierID        uuid.UUID   `json:"verifierId"`
	VerifiedAt        time.Time   `json:"verifiedAt"`
	LocationConfirmed *bool       `json:"locationConfirmed"`
	Condition         *string     `json:"condition"`
	Notes             *string     `json:"notes"`
	PhotoEvidenceIDs  []uuid.UUID `json:"photoEvidenceIds"`
}

// VerifyAssetRequest is the payload for POST /assets/{id}/verify.
type VerifyAssetRequest struct {
	LocationConfirmed *bool       `json:"locationConfirmed"`
	Condition         *string     `json:"condition"`
	Notes             *string     `json:"notes"`
	PhotoEvidenceIDs  []uuid.UUID `json:"photoEvidenceIds"`
}

// AssetVerificationConditions are the valid condition values.
var AssetVerificationConditions = map[string]bool{
	"good": true, "fair": true, "poor": true, "damaged": true, "missing": true, "not_found": true,
}

// ──────────────────────────────────────────────
// Verification Campaign types
// ──────────────────────────────────────────────

// VerificationCampaign represents a physical stocktake campaign.
type VerificationCampaign struct {
	ID               uuid.UUID       `json:"id"`
	TenantID         uuid.UUID       `json:"tenantId"`
	Name             string          `json:"name"`
	Description      *string         `json:"description"`
	Status           string          `json:"status"`
	ScopeFilter      json.RawMessage `json:"scopeFilter"`
	TargetAssetCount int             `json:"targetAssetCount"`
	VerifiedCount    int             `json:"verifiedCount"`
	DiscrepancyCount int             `json:"discrepancyCount"`
	StartedAt        *time.Time      `json:"startedAt"`
	CompletedAt      *time.Time      `json:"completedAt"`
	CreatedBy        uuid.UUID       `json:"createdBy"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// CreateCampaignRequest is the payload for POST /verification/campaigns.
type CreateCampaignRequest struct {
	Name        string          `json:"name" validate:"required"`
	Description *string         `json:"description"`
	ScopeFilter json.RawMessage `json:"scopeFilter"`
}

// CampaignVerifyRequest is the payload for verifying an asset within a campaign.
type CampaignVerifyRequest struct {
	LocationConfirmed *bool       `json:"locationConfirmed"`
	Condition         *string     `json:"condition"`
	ActualLocation    *string     `json:"actualLocation"`
	Notes             *string     `json:"notes"`
	PhotoEvidenceIDs  []uuid.UUID `json:"photoEvidenceIds"`
	DiscrepancyType   *string     `json:"discrepancyType"`
}

// BulkVerifyRequest is the payload for POST /verification/bulk-verify.
type BulkVerifyRequest struct {
	AssetIDs   []uuid.UUID `json:"assetIds" validate:"required"`
	CampaignID *uuid.UUID  `json:"campaignId"`
	Condition  *string     `json:"condition"`
}

// VerificationStats holds summary counts for the verification status dashboard.
type VerificationStats struct {
	Total       int `json:"total"`
	Verified    int `json:"verified"`
	Unverified  int `json:"unverified"`
	Discrepancy int `json:"discrepancy"`
	Overdue     int `json:"overdue"`
}

// CMDBItem represents a configuration item in the CMDB.
type CMDBItem struct {
	ID         uuid.UUID       `json:"id"`
	TenantID   uuid.UUID       `json:"tenantId"`
	CIType     string          `json:"ciType"`
	Name       string          `json:"name"`
	Status     string          `json:"status"`
	AssetID    *uuid.UUID      `json:"assetId"`
	Attributes json.RawMessage `json:"attributes"`
	Version    int             `json:"version"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
}

// CMDBRelationship defines a typed relationship between two configuration items.
type CMDBRelationship struct {
	ID               uuid.UUID `json:"id"`
	SourceCIID       uuid.UUID `json:"sourceCiId"`
	TargetCIID       uuid.UUID `json:"targetCiId"`
	RelationshipType string    `json:"relationshipType"`
	Description      *string   `json:"description"`
	IsActive         bool      `json:"isActive"`
	CreatedAt        time.Time `json:"createdAt"`
}

// ReconciliationRun records a discovery/reconciliation pass against an external source.
type ReconciliationRun struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenantId"`
	Source        string          `json:"source"`
	StartedAt     time.Time       `json:"startedAt"`
	CompletedAt   *time.Time      `json:"completedAt"`
	Matches       int             `json:"matches"`
	Discrepancies int             `json:"discrepancies"`
	NewItems      int             `json:"newItems"`
	Report        json.RawMessage `json:"report"`
	CreatedAt     time.Time       `json:"createdAt"`
}

// License represents a software license entitlement.
type License struct {
	ID                uuid.UUID  `json:"id"`
	TenantID          uuid.UUID  `json:"tenantId"`
	SoftwareName      string     `json:"softwareName"`
	Vendor            *string    `json:"vendor"`
	LicenseType       string     `json:"licenseType"`
	TotalEntitlements int        `json:"totalEntitlements"`
	AssignedCount     int        `json:"assignedCount"`
	ComplianceStatus  string     `json:"complianceStatus"`
	ExpiryDate        *time.Time `json:"expiryDate"`
	Cost              *float64   `json:"cost"`
	RenewalContact    *string    `json:"renewalContact"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

// LicenseAssignment records a license allocated to a user or asset.
type LicenseAssignment struct {
	ID         uuid.UUID  `json:"id"`
	LicenseID  uuid.UUID  `json:"licenseId"`
	TenantID   uuid.UUID  `json:"tenantId"`
	UserID     *uuid.UUID `json:"userId"`
	AssetID    *uuid.UUID `json:"assetId"`
	AssignedAt time.Time  `json:"assignedAt"`
}

// Warranty represents a warranty or support contract for an asset.
type Warranty struct {
	ID             uuid.UUID `json:"id"`
	AssetID        uuid.UUID `json:"assetId"`
	TenantID       uuid.UUID `json:"tenantId"`
	Vendor         *string   `json:"vendor"`
	ContractNumber *string   `json:"contractNumber"`
	CoverageType   *string   `json:"coverageType"`
	StartDate      time.Time `json:"startDate"`
	EndDate        time.Time `json:"endDate"`
	Cost           *float64  `json:"cost"`
	RenewalStatus  string    `json:"renewalStatus"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// RenewalAlert represents a scheduled renewal reminder for a license or warranty.
type RenewalAlert struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenantId"`
	EntityType string    `json:"entityType"`
	EntityID   uuid.UUID `json:"entityId"`
	AlertDate  time.Time `json:"alertDate"`
	Sent       bool      `json:"sent"`
	CreatedAt  time.Time `json:"createdAt"`
}

// ──────────────────────────────────────────────
// Stats types
// ──────────────────────────────────────────────

// AssetStats provides aggregate asset statistics for a tenant dashboard.
type AssetStats struct {
	Total            int `json:"total"`
	ActiveCount      int `json:"activeCount"`
	MaintenanceCount int `json:"maintenanceCount"`
	RetiredCount     int `json:"retiredCount"`
}

// LicenseComplianceStats provides aggregate license compliance metrics.
type LicenseComplianceStats struct {
	Total         int `json:"total"`
	Compliant     int `json:"compliant"`
	OverDeployed  int `json:"overDeployed"`
	UnderUtilized int `json:"underUtilized"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateAssetRequest is the payload for registering a new IT asset.
type CreateAssetRequest struct {
	Name           string           `json:"name" validate:"required"`
	AssetTag       string           `json:"assetTag" validate:"required"`
	Type           string           `json:"type" validate:"required"`
	Status         string           `json:"status" validate:"required"`
	Category       *string          `json:"category"`
	Description    *string          `json:"description"`
	Manufacturer   *string          `json:"manufacturer"`
	Model          *string          `json:"model"`
	SerialNumber   *string          `json:"serialNumber"`
	Location       *string          `json:"location"`
	Building       *string          `json:"building"`
	Floor          *string          `json:"floor"`
	Room           *string          `json:"room"`
	Classification *string          `json:"classification"`
	OwnerID        *uuid.UUID       `json:"ownerId"`
	CustodianID    *uuid.UUID       `json:"custodianId"`
	PurchaseDate   *time.Time       `json:"purchaseDate"`
	PurchaseCost   *float64         `json:"purchaseCost"`
	Currency       *string          `json:"currency"`
	Attributes     *json.RawMessage `json:"attributes"`
	Tags           []string         `json:"tags"`
}

// UpdateAssetRequest is the payload for updating an existing asset (partial update).
type UpdateAssetRequest struct {
	Name           *string          `json:"name"`
	AssetTag       *string          `json:"assetTag"`
	Type           *string          `json:"type"`
	Status         *string          `json:"status"`
	Category       *string          `json:"category"`
	Description    *string          `json:"description"`
	Manufacturer   *string          `json:"manufacturer"`
	Model          *string          `json:"model"`
	SerialNumber   *string          `json:"serialNumber"`
	Location       *string          `json:"location"`
	Building       *string          `json:"building"`
	Floor          *string          `json:"floor"`
	Room           *string          `json:"room"`
	Classification *string          `json:"classification"`
	OwnerID        *uuid.UUID       `json:"ownerId"`
	CustodianID    *uuid.UUID       `json:"custodianId"`
	PurchaseDate   *time.Time       `json:"purchaseDate"`
	PurchaseCost   *float64         `json:"purchaseCost"`
	Currency       *string          `json:"currency"`
	Attributes     *json.RawMessage `json:"attributes"`
	Tags           []string         `json:"tags"`
}

// CreateLifecycleEventRequest is the payload for recording an asset lifecycle event.
type CreateLifecycleEventRequest struct {
	AssetID            uuid.UUID        `json:"assetId" validate:"required"`
	EventType          string           `json:"eventType" validate:"required"`
	Details            *json.RawMessage `json:"details"`
	EvidenceDocumentID *uuid.UUID       `json:"evidenceDocumentId"`
}

// CreateDisposalRequest is the payload for initiating an asset disposal.
type CreateDisposalRequest struct {
	AssetID           uuid.UUID   `json:"assetId" validate:"required"`
	DisposalMethod    string      `json:"disposalMethod" validate:"required"`
	Reason            string      `json:"reason" validate:"required"`
	WitnessIDs        []uuid.UUID `json:"witnessIds"`
	DataWipeConfirmed bool        `json:"dataWipeConfirmed"`
	ApprovalChainID   *uuid.UUID  `json:"approvalChainId"`
}

// UpdateDisposalStatusRequest is the payload for advancing a disposal through its workflow.
type UpdateDisposalStatusRequest struct {
	Status                   string     `json:"status" validate:"required"`
	ApprovedBy               *uuid.UUID `json:"approvedBy"`
	DisposalDate             *time.Time `json:"disposalDate"`
	DisposalCertificateDocID *uuid.UUID `json:"disposalCertificateDocId"`
}

// CreateCMDBItemRequest is the payload for creating a configuration item.
type CreateCMDBItemRequest struct {
	CIType     string           `json:"ciType" validate:"required"`
	Name       string           `json:"name" validate:"required"`
	Status     *string          `json:"status"`
	AssetID    *uuid.UUID       `json:"assetId"`
	Attributes *json.RawMessage `json:"attributes"`
}

// UpdateCMDBItemRequest is the payload for updating a configuration item (partial update).
type UpdateCMDBItemRequest struct {
	CIType     *string          `json:"ciType"`
	Name       *string          `json:"name"`
	Status     *string          `json:"status"`
	AssetID    *uuid.UUID       `json:"assetId"`
	Attributes *json.RawMessage `json:"attributes"`
}

// CreateRelationshipRequest is the payload for creating a CI relationship.
type CreateRelationshipRequest struct {
	SourceCIID       uuid.UUID `json:"sourceCiId" validate:"required"`
	TargetCIID       uuid.UUID `json:"targetCiId" validate:"required"`
	RelationshipType string    `json:"relationshipType" validate:"required"`
	Description      *string   `json:"description"`
}

// CreateReconciliationRunRequest is the payload for starting a reconciliation run.
type CreateReconciliationRunRequest struct {
	Source string           `json:"source" validate:"required"`
	Report *json.RawMessage `json:"report"`
}

// UpdateReconciliationRunRequest is the payload for updating/completing a reconciliation run.
type UpdateReconciliationRunRequest struct {
	CompletedAt   *time.Time       `json:"completedAt"`
	Matches       *int             `json:"matches"`
	Discrepancies *int             `json:"discrepancies"`
	NewItems      *int             `json:"newItems"`
	Report        *json.RawMessage `json:"report"`
}

// CompleteReconciliationRunRequest is an alias for backward compatibility.
type CompleteReconciliationRunRequest = UpdateReconciliationRunRequest

// CreateLicenseRequest is the payload for creating a software license record.
type CreateLicenseRequest struct {
	SoftwareName      string     `json:"softwareName" validate:"required"`
	Vendor            string     `json:"vendor" validate:"required"`
	LicenseType       string     `json:"licenseType" validate:"required"`
	TotalEntitlements int        `json:"totalEntitlements" validate:"required"`
	ExpiryDate        *time.Time `json:"expiryDate"`
	Cost              *float64   `json:"cost"`
	RenewalContact    *string    `json:"renewalContact"`
}

// UpdateLicenseRequest is the payload for updating a license record (partial update).
type UpdateLicenseRequest struct {
	SoftwareName      *string    `json:"softwareName"`
	Vendor            *string    `json:"vendor"`
	LicenseType       *string    `json:"licenseType"`
	TotalEntitlements *int       `json:"totalEntitlements"`
	ComplianceStatus  *string    `json:"complianceStatus"`
	ExpiryDate        *time.Time `json:"expiryDate"`
	Cost              *float64   `json:"cost"`
	RenewalContact    *string    `json:"renewalContact"`
}

// CreateLicenseAssignmentRequest is the payload for assigning a license.
type CreateLicenseAssignmentRequest struct {
	LicenseID uuid.UUID  `json:"licenseId" validate:"required"`
	UserID    *uuid.UUID `json:"userId"`
	AssetID   *uuid.UUID `json:"assetId"`
}

// CreateWarrantyRequest is the payload for creating a warranty record.
type CreateWarrantyRequest struct {
	AssetID        uuid.UUID `json:"assetId" validate:"required"`
	Vendor         *string   `json:"vendor"`
	ContractNumber *string   `json:"contractNumber"`
	CoverageType   *string   `json:"coverageType"`
	StartDate      time.Time `json:"startDate" validate:"required"`
	EndDate        time.Time `json:"endDate" validate:"required"`
	Cost           *float64  `json:"cost"`
	RenewalStatus  *string   `json:"renewalStatus"`
}

// UpdateWarrantyRequest is the payload for updating a warranty record (partial update).
type UpdateWarrantyRequest struct {
	Vendor         *string    `json:"vendor"`
	ContractNumber *string    `json:"contractNumber"`
	CoverageType   *string    `json:"coverageType"`
	StartDate      *time.Time `json:"startDate"`
	EndDate        *time.Time `json:"endDate"`
	Cost           *float64   `json:"cost"`
	RenewalStatus  *string    `json:"renewalStatus"`
}

// CreateRenewalAlertRequest is the payload for scheduling a renewal alert.
type CreateRenewalAlertRequest struct {
	EntityType string    `json:"entityType" validate:"required"`
	EntityID   uuid.UUID `json:"entityId" validate:"required"`
	AlertDate  time.Time `json:"alertDate" validate:"required"`
}

// ──────────────────────────────────────────────
// Discovery types
// ──────────────────────────────────────────────

// DiscoveryProfile represents a scan configuration for automated CI discovery.
type DiscoveryProfile struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenantId"`
	Name          string          `json:"name"`
	Description   *string         `json:"description,omitempty"`
	ScanType      string          `json:"scanType"`
	Configuration json.RawMessage `json:"configuration"`
	Schedule      *string         `json:"schedule,omitempty"`
	IsActive      bool            `json:"isActive"`
	LastRunAt     *time.Time      `json:"lastRunAt,omitempty"`
	CreatedBy     uuid.UUID       `json:"createdBy"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
	// Enrichment
	CreatedByName *string `json:"createdByName,omitempty"`
}

// DiscoveryRun tracks execution of a discovery scan.
type DiscoveryRun struct {
	ID           uuid.UUID       `json:"id"`
	TenantID     uuid.UUID       `json:"tenantId"`
	ProfileID    uuid.UUID       `json:"profileId"`
	ScanType     *string         `json:"scanType,omitempty"`
	Status       string          `json:"status"`
	StartedAt    *time.Time      `json:"startedAt,omitempty"`
	CompletedAt  *time.Time      `json:"completedAt,omitempty"`
	DevicesFound int             `json:"devicesFound"`
	NewCIs       int             `json:"newCis"`
	UpdatedCIs   int             `json:"updatedCis"`
	Errors       json.RawMessage `json:"errors"`
	CreatedAt    time.Time       `json:"createdAt"`
	// Enrichment
	ProfileName *string `json:"profileName,omitempty"`
}

// DiscoveredDevice represents a device found during a discovery scan.
type DiscoveredDevice struct {
	ID              uuid.UUID       `json:"id"`
	RunID           uuid.UUID       `json:"runId"`
	Source          *string         `json:"source,omitempty"`
	Hostname        *string         `json:"hostname,omitempty"`
	IPAddress       *string         `json:"ipAddress,omitempty"`
	MACAddress      *string         `json:"macAddress,omitempty"`
	DeviceType      *string         `json:"deviceType,omitempty"`
	OSName          *string         `json:"osName,omitempty"`
	OSVersion       *string         `json:"osVersion,omitempty"`
	Manufacturer    *string         `json:"manufacturer,omitempty"`
	Model           *string         `json:"model,omitempty"`
	SerialNumber    *string         `json:"serialNumber,omitempty"`
	OpenPorts       []int32         `json:"openPorts"`
	Attributes      json.RawMessage `json:"attributes"`
	MatchedCIID     *uuid.UUID      `json:"matchedCiId,omitempty"`
	MatchConfidence *float64        `json:"matchConfidence,omitempty"`
	Action          *string         `json:"action,omitempty"`
	CreatedAt       time.Time       `json:"createdAt"`
}

// DiscoveryRunWithDevices is the full run view with discovered devices.
type DiscoveryRunWithDevices struct {
	DiscoveryRun
	Devices []DiscoveredDevice `json:"devices"`
}

// DiscoveryStats holds aggregate counts for the discovery dashboard.
type DiscoveryStats struct {
	TotalProfiles  int        `json:"totalProfiles"`
	ActiveProfiles int        `json:"activeProfiles"`
	TotalRuns      int        `json:"totalRuns"`
	LastRunAt      *time.Time `json:"lastRunAt,omitempty"`
	ADEnabled      bool       `json:"adEnabled"`
	ADTenantID     *string    `json:"adTenantId,omitempty"`
	NetworkEnabled bool       `json:"networkEnabled"`
	SCCMConfigured bool       `json:"sccmConfigured"`
}

// ──────────────────────────────────────────────
// Discovery request types
// ──────────────────────────────────────────────

// CreateDiscoveryProfileRequest is the payload for creating a discovery profile.
type CreateDiscoveryProfileRequest struct {
	Name          string          `json:"name" validate:"required"`
	Description   *string         `json:"description"`
	ScanType      string          `json:"scanType" validate:"required"`
	Configuration json.RawMessage `json:"configuration"`
	Schedule      *string         `json:"schedule"`
}

// UpdateDiscoveryProfileRequest is the payload for updating a discovery profile.
type UpdateDiscoveryProfileRequest struct {
	Name          *string          `json:"name"`
	Description   *string          `json:"description"`
	ScanType      *string          `json:"scanType"`
	Configuration *json.RawMessage `json:"configuration"`
	Schedule      *string          `json:"schedule"`
	IsActive      *bool            `json:"isActive"`
}

// ReconcileDiscoveryRequest is the payload for applying discovery results to the CMDB.
type ReconcileDiscoveryRequest struct {
	DeviceIDs []uuid.UUID `json:"deviceIds" validate:"required"`
}

// ──────────────────────────────────────────────
// Asset lifecycle state machine
// ──────────────────────────────────────────────

// validAssetTransitions defines the allowed state machine transitions for asset status.
var validAssetTransitions = map[string][]string{
	AssetStatusProcured:    {AssetStatusReceived},
	AssetStatusReceived:    {AssetStatusActive},
	AssetStatusActive:      {AssetStatusMaintenance, AssetStatusRetired},
	AssetStatusMaintenance: {AssetStatusActive, AssetStatusRetired},
	AssetStatusRetired:     {AssetStatusDisposed},
	AssetStatusDisposed:    {},
}

// IsValidAssetTransition checks whether an asset status transition from -> to is allowed.
func IsValidAssetTransition(from, to string) bool {
	allowed, ok := validAssetTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// ──────────────────────────────────────────────
// ERP Integration types
// ──────────────────────────────────────────────

// ERPSyncLog tracks the result of an ERP sync run.
type ERPSyncLog struct {
	ID           uuid.UUID       `json:"id"`
	TenantID     uuid.UUID       `json:"tenantId"`
	Status       string          `json:"status"`
	StartedAt    time.Time       `json:"startedAt"`
	CompletedAt  *time.Time      `json:"completedAt"`
	AssetsSynced int             `json:"assetsSynced"`
	AssetsFailed int             `json:"assetsFailed"`
	ErrorDetails json.RawMessage `json:"errorDetails"`
	TriggeredBy  *uuid.UUID      `json:"triggeredBy"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// AssetFinancialView is the API response for an asset's financial details.
type AssetFinancialView struct {
	AssetID          uuid.UUID  `json:"assetId"`
	AssetTag         string     `json:"assetTag"`
	AssetName        string     `json:"assetName"`
	PurchasePrice    *float64   `json:"purchasePrice"`
	PurchaseCost     *float64   `json:"purchaseCost"`
	Currency         *string    `json:"currency"`
	CurrentBookValue *float64   `json:"currentBookValue"`
	DepreciationRate *float64   `json:"depreciationRate"`
	CostCenter       *string    `json:"costCenter"`
	PONumber         *string    `json:"poNumber"`
	ERPAssetID       *string    `json:"erpAssetId"`
	ERPSyncAt        *time.Time `json:"erpSyncAt"`
	PurchaseDate     *time.Time `json:"purchaseDate"`
}

// ERPSyncStatus is the response for the /erp/status endpoint.
type ERPSyncStatus struct {
	ERPEnabled  bool        `json:"erpEnabled"`
	LastSync    *ERPSyncLog `json:"lastSync"`
	TotalSynced int         `json:"totalSynced"`
}

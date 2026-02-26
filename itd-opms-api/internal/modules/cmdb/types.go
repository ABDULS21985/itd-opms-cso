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
	Category       string          `json:"category"`
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
	Currency       string          `json:"currency"`
	Classification *string         `json:"classification"`
	Attributes     json.RawMessage `json:"attributes"`
	Tags           []string        `json:"tags"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

// AssetLifecycleEvent records a lifecycle transition for an asset.
type AssetLifecycleEvent struct {
	ID                 uuid.UUID       `json:"id"`
	AssetID            uuid.UUID       `json:"assetId"`
	EventType          string          `json:"eventType"`
	PerformedBy        *uuid.UUID      `json:"performedBy"`
	Details            json.RawMessage `json:"details"`
	EvidenceDocumentID *uuid.UUID      `json:"evidenceDocumentId"`
	Timestamp          time.Time       `json:"timestamp"`
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
	LicenseKey        *string    `json:"licenseKey"`
	TotalEntitlements int        `json:"totalEntitlements"`
	AssignedCount     int        `json:"assignedCount"`
	ComplianceStatus  string     `json:"complianceStatus"`
	ExpiryDate        *time.Time `json:"expiryDate"`
	Cost              *float64   `json:"cost"`
	Currency          string     `json:"currency"`
	RenewalContact    *string    `json:"renewalContact"`
	Notes             *string    `json:"notes"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

// LicenseAssignment records a license allocated to a user or asset.
type LicenseAssignment struct {
	ID         uuid.UUID  `json:"id"`
	LicenseID  uuid.UUID  `json:"licenseId"`
	UserID     *uuid.UUID `json:"userId"`
	AssetID    *uuid.UUID `json:"assetId"`
	AssignedAt time.Time  `json:"assignedAt"`
}

// Warranty represents a warranty or support contract for an asset.
type Warranty struct {
	ID             uuid.UUID  `json:"id"`
	AssetID        uuid.UUID  `json:"assetId"`
	TenantID       uuid.UUID  `json:"tenantId"`
	Vendor         string     `json:"vendor"`
	ContractNumber *string    `json:"contractNumber"`
	CoverageType   *string    `json:"coverageType"`
	StartDate      time.Time  `json:"startDate"`
	EndDate        time.Time  `json:"endDate"`
	Cost           *float64   `json:"cost"`
	Currency       string     `json:"currency"`
	RenewalStatus  string     `json:"renewalStatus"`
	Notes          *string    `json:"notes"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// RenewalAlert represents a scheduled renewal reminder for a license or warranty.
type RenewalAlert struct {
	ID         uuid.UUID `json:"id"`
	EntityType string    `json:"entityType"`
	EntityID   uuid.UUID `json:"entityId"`
	TenantID   uuid.UUID `json:"tenantId"`
	AlertDate  time.Time `json:"alertDate"`
	Sent       bool      `json:"sent"`
	CreatedAt  time.Time `json:"createdAt"`
}

// ──────────────────────────────────────────────
// Stat types
// ──────────────────────────────────────────────

// AssetStats provides aggregate asset statistics for a tenant dashboard.
type AssetStats struct {
	TotalCount      int            `json:"totalCount"`
	ByStatus        map[string]int `json:"byStatus"`
	ByType          map[string]int `json:"byType"`
}

// LicenseComplianceStats provides aggregate license compliance metrics.
type LicenseComplianceStats struct {
	Total          int `json:"total"`
	Compliant      int `json:"compliant"`
	OverDeployed   int `json:"overDeployed"`
	UnderUtilized  int `json:"underUtilized"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateAssetRequest is the payload for registering a new IT asset.
type CreateAssetRequest struct {
	Name           string          `json:"name" validate:"required"`
	AssetTag       string          `json:"assetTag" validate:"required"`
	Type           string          `json:"type" validate:"required"`
	Category       string          `json:"category" validate:"required"`
	Description    *string         `json:"description"`
	Manufacturer   *string         `json:"manufacturer"`
	Model          *string         `json:"model"`
	SerialNumber   *string         `json:"serialNumber"`
	Status         *string         `json:"status"`
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
}

// UpdateAssetRequest is the payload for updating an existing asset (partial update).
type UpdateAssetRequest struct {
	AssetTag       *string         `json:"assetTag"`
	Type           *string         `json:"type"`
	Category       *string         `json:"category"`
	Name           *string         `json:"name"`
	Description    *string         `json:"description"`
	Manufacturer   *string         `json:"manufacturer"`
	Model          *string         `json:"model"`
	SerialNumber   *string         `json:"serialNumber"`
	Status         *string         `json:"status"`
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
}

// CreateDisposalRequest is the payload for initiating an asset disposal.
type CreateDisposalRequest struct {
	AssetID                  uuid.UUID   `json:"assetId" validate:"required"`
	DisposalMethod           string      `json:"disposalMethod" validate:"required"`
	Reason                   string      `json:"reason" validate:"required"`
	ApprovalChainID          *uuid.UUID  `json:"approvalChainId"`
	WitnessIDs               []uuid.UUID `json:"witnessIds"`
	DataWipeConfirmed        *bool       `json:"dataWipeConfirmed"`
}

// UpdateDisposalStatusRequest is the payload for advancing a disposal through its workflow.
type UpdateDisposalStatusRequest struct {
	Status                   string     `json:"status" validate:"required"`
	ApprovedBy               *uuid.UUID `json:"approvedBy"`
	DisposalDate             *time.Time `json:"disposalDate"`
	DisposalCertificateDocID *uuid.UUID `json:"disposalCertificateDocId"`
	DataWipeConfirmed        *bool      `json:"dataWipeConfirmed"`
}

// CreateCMDBItemRequest is the payload for creating a configuration item.
type CreateCMDBItemRequest struct {
	CIType     string          `json:"ciType" validate:"required"`
	Name       string          `json:"name" validate:"required"`
	Status     *string         `json:"status"`
	AssetID    *uuid.UUID      `json:"assetId"`
	Attributes json.RawMessage `json:"attributes"`
}

// UpdateCMDBItemRequest is the payload for updating a configuration item (partial update).
type UpdateCMDBItemRequest struct {
	CIType     *string         `json:"ciType"`
	Name       *string         `json:"name"`
	Status     *string         `json:"status"`
	AssetID    *uuid.UUID      `json:"assetId"`
	Attributes json.RawMessage `json:"attributes"`
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
	Source string `json:"source" validate:"required"`
}

// CompleteReconciliationRunRequest is the payload for completing a reconciliation run.
type CompleteReconciliationRunRequest struct {
	Matches       int             `json:"matches"`
	Discrepancies int             `json:"discrepancies"`
	NewItems      int             `json:"newItems"`
	Report        json.RawMessage `json:"report"`
}

// CreateLicenseRequest is the payload for creating a software license record.
type CreateLicenseRequest struct {
	SoftwareName      string     `json:"softwareName" validate:"required"`
	Vendor            *string    `json:"vendor"`
	LicenseType       string     `json:"licenseType" validate:"required"`
	LicenseKey        *string    `json:"licenseKey"`
	TotalEntitlements int        `json:"totalEntitlements" validate:"required"`
	ExpiryDate        *time.Time `json:"expiryDate"`
	Cost              *float64   `json:"cost"`
	Currency          *string    `json:"currency"`
	RenewalContact    *string    `json:"renewalContact"`
	Notes             *string    `json:"notes"`
}

// UpdateLicenseRequest is the payload for updating a license record (partial update).
type UpdateLicenseRequest struct {
	SoftwareName      *string    `json:"softwareName"`
	Vendor            *string    `json:"vendor"`
	LicenseType       *string    `json:"licenseType"`
	LicenseKey        *string    `json:"licenseKey"`
	TotalEntitlements *int       `json:"totalEntitlements"`
	ComplianceStatus  *string    `json:"complianceStatus"`
	ExpiryDate        *time.Time `json:"expiryDate"`
	Cost              *float64   `json:"cost"`
	Currency          *string    `json:"currency"`
	RenewalContact    *string    `json:"renewalContact"`
	Notes             *string    `json:"notes"`
}

// CreateLicenseAssignmentRequest is the payload for assigning a license.
type CreateLicenseAssignmentRequest struct {
	LicenseID uuid.UUID  `json:"licenseId" validate:"required"`
	UserID    *uuid.UUID `json:"userId"`
	AssetID   *uuid.UUID `json:"assetId"`
}

// CreateWarrantyRequest is the payload for creating a warranty record.
type CreateWarrantyRequest struct {
	AssetID        uuid.UUID  `json:"assetId" validate:"required"`
	Vendor         string     `json:"vendor" validate:"required"`
	ContractNumber *string    `json:"contractNumber"`
	CoverageType   *string    `json:"coverageType"`
	StartDate      time.Time  `json:"startDate" validate:"required"`
	EndDate        time.Time  `json:"endDate" validate:"required"`
	Cost           *float64   `json:"cost"`
	Currency       *string    `json:"currency"`
	RenewalStatus  *string    `json:"renewalStatus"`
	Notes          *string    `json:"notes"`
}

// UpdateWarrantyRequest is the payload for updating a warranty record (partial update).
type UpdateWarrantyRequest struct {
	Vendor         *string    `json:"vendor"`
	ContractNumber *string    `json:"contractNumber"`
	CoverageType   *string    `json:"coverageType"`
	StartDate      *time.Time `json:"startDate"`
	EndDate        *time.Time `json:"endDate"`
	Cost           *float64   `json:"cost"`
	Currency       *string    `json:"currency"`
	RenewalStatus  *string    `json:"renewalStatus"`
	Notes          *string    `json:"notes"`
}

// CreateRenewalAlertRequest is the payload for scheduling a renewal alert.
type CreateRenewalAlertRequest struct {
	EntityType string    `json:"entityType" validate:"required"`
	EntityID   uuid.UUID `json:"entityId" validate:"required"`
	AlertDate  time.Time `json:"alertDate" validate:"required"`
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

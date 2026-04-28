package cmdb

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	AssetProcessTypeDeployment         = "deployment"
	AssetProcessTypeRedeployment       = "redeployment"
	AssetProcessTypeMaintenance        = "maintenance"
	AssetProcessTypeRetirementDisposal = "retirement_disposal"
	AssetProcessTypeManagementReport   = "management_report"
)

type AssetProcessRun struct {
	ID                  uuid.UUID       `json:"id"`
	TenantID            uuid.UUID       `json:"tenantId"`
	ProcessNumber       string          `json:"processNumber"`
	ProcessType         string          `json:"processType"`
	Title               string          `json:"title"`
	Description         *string         `json:"description,omitempty"`
	SourceType          string          `json:"sourceType"`
	SourceID            *uuid.UUID      `json:"sourceId,omitempty"`
	TicketID            *uuid.UUID      `json:"ticketId,omitempty"`
	ServiceRequestID    *uuid.UUID      `json:"serviceRequestId,omitempty"`
	AssetID             *uuid.UUID      `json:"assetId,omitempty"`
	AssignedAssetID     *uuid.UUID      `json:"assignedAssetId,omitempty"`
	StopGapAssetID      *uuid.UUID      `json:"stopGapAssetId,omitempty"`
	RequestedForID      *uuid.UUID      `json:"requestedForId,omitempty"`
	Status              string          `json:"status"`
	ApprovalRequired    bool            `json:"approvalRequired"`
	ApprovalStatus      string          `json:"approvalStatus"`
	AvailabilityStatus  string          `json:"availabilityStatus"`
	RequesterStatus     *string         `json:"requesterStatus,omitempty"`
	ReplacementEligible *bool           `json:"replacementEligible,omitempty"`
	BuybackOption       *bool           `json:"buybackOption,omitempty"`
	BuybackApproved     *bool           `json:"buybackApproved,omitempty"`
	ExitReason          *string         `json:"exitReason,omitempty"`
	WarrantyStatus      *string         `json:"warrantyStatus,omitempty"`
	DataWipeConfirmed   bool            `json:"dataWipeConfirmed"`
	DeliverySigned      bool            `json:"deliverySigned"`
	ReturnSigned        bool            `json:"returnSigned"`
	ResponsibleUserID   *uuid.UUID      `json:"responsibleUserId,omitempty"`
	AccountableUserID   *uuid.UUID      `json:"accountableUserId,omitempty"`
	Details             json.RawMessage `json:"details,omitempty"`
	Evidence            json.RawMessage `json:"evidence,omitempty"`
	CreatedBy           uuid.UUID       `json:"createdBy"`
	CreatedAt           time.Time       `json:"createdAt"`
	UpdatedAt           time.Time       `json:"updatedAt"`

	AssetTag            *string `json:"assetTag,omitempty"`
	AssetName           *string `json:"assetName,omitempty"`
	AssignedAssetTag    *string `json:"assignedAssetTag,omitempty"`
	StopGapAssetTag     *string `json:"stopGapAssetTag,omitempty"`
	RequestedForName    *string `json:"requestedForName,omitempty"`
	ResponsibleUserName *string `json:"responsibleUserName,omitempty"`
	AccountableUserName *string `json:"accountableUserName,omitempty"`
	CreatedByName       *string `json:"createdByName,omitempty"`
	TicketNumber        *string `json:"ticketNumber,omitempty"`
	RequestNumber       *string `json:"requestNumber,omitempty"`
}

type AssetProcessEvent struct {
	ID         uuid.UUID       `json:"id"`
	TenantID   uuid.UUID       `json:"tenantId"`
	ProcessID  uuid.UUID       `json:"processId"`
	FromStatus *string         `json:"fromStatus,omitempty"`
	ToStatus   string          `json:"toStatus"`
	Action     string          `json:"action"`
	ActorID    uuid.UUID       `json:"actorId"`
	Comment    *string         `json:"comment,omitempty"`
	Decision   *string         `json:"decision,omitempty"`
	Evidence   json.RawMessage `json:"evidence,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
	ActorName  *string         `json:"actorName,omitempty"`
}

type AssetProcessStats struct {
	Total              int            `json:"total"`
	Deployment         int            `json:"deployment"`
	Redeployment       int            `json:"redeployment"`
	Maintenance        int            `json:"maintenance"`
	RetirementDisposal int            `json:"retirementDisposal"`
	Open               int            `json:"open"`
	Closed             int            `json:"closed"`
	WaitingList        int            `json:"waitingList"`
	ByStatus           map[string]int `json:"byStatus"`
	ByType             map[string]int `json:"byType"`
}

type CreateAssetProcessRunRequest struct {
	ProcessType       string           `json:"processType"`
	Title             string           `json:"title"`
	Description       *string          `json:"description,omitempty"`
	SourceType        string           `json:"sourceType,omitempty"`
	SourceID          *uuid.UUID       `json:"sourceId,omitempty"`
	TicketID          *uuid.UUID       `json:"ticketId,omitempty"`
	ServiceRequestID  *uuid.UUID       `json:"serviceRequestId,omitempty"`
	AssetID           *uuid.UUID       `json:"assetId,omitempty"`
	AssignedAssetID   *uuid.UUID       `json:"assignedAssetId,omitempty"`
	StopGapAssetID    *uuid.UUID       `json:"stopGapAssetId,omitempty"`
	RequestedForID    *uuid.UUID       `json:"requestedForId,omitempty"`
	ApprovalRequired  *bool            `json:"approvalRequired,omitempty"`
	RequesterStatus   *string          `json:"requesterStatus,omitempty"`
	ResponsibleUserID *uuid.UUID       `json:"responsibleUserId,omitempty"`
	AccountableUserID *uuid.UUID       `json:"accountableUserId,omitempty"`
	Details           *json.RawMessage `json:"details,omitempty"`
	Evidence          *json.RawMessage `json:"evidence,omitempty"`
}

type UpdateAssetProcessRunRequest struct {
	Title               *string          `json:"title,omitempty"`
	Description         *string          `json:"description,omitempty"`
	SourceType          *string          `json:"sourceType,omitempty"`
	SourceID            *uuid.UUID       `json:"sourceId,omitempty"`
	TicketID            *uuid.UUID       `json:"ticketId,omitempty"`
	ServiceRequestID    *uuid.UUID       `json:"serviceRequestId,omitempty"`
	AssetID             *uuid.UUID       `json:"assetId,omitempty"`
	AssignedAssetID     *uuid.UUID       `json:"assignedAssetId,omitempty"`
	StopGapAssetID      *uuid.UUID       `json:"stopGapAssetId,omitempty"`
	RequestedForID      *uuid.UUID       `json:"requestedForId,omitempty"`
	ApprovalRequired    *bool            `json:"approvalRequired,omitempty"`
	ApprovalStatus      *string          `json:"approvalStatus,omitempty"`
	AvailabilityStatus  *string          `json:"availabilityStatus,omitempty"`
	RequesterStatus     *string          `json:"requesterStatus,omitempty"`
	ReplacementEligible *bool            `json:"replacementEligible,omitempty"`
	BuybackOption       *bool            `json:"buybackOption,omitempty"`
	BuybackApproved     *bool            `json:"buybackApproved,omitempty"`
	ExitReason          *string          `json:"exitReason,omitempty"`
	WarrantyStatus      *string          `json:"warrantyStatus,omitempty"`
	DataWipeConfirmed   *bool            `json:"dataWipeConfirmed,omitempty"`
	DeliverySigned      *bool            `json:"deliverySigned,omitempty"`
	ReturnSigned        *bool            `json:"returnSigned,omitempty"`
	ResponsibleUserID   *uuid.UUID       `json:"responsibleUserId,omitempty"`
	AccountableUserID   *uuid.UUID       `json:"accountableUserId,omitempty"`
	Details             *json.RawMessage `json:"details,omitempty"`
	Evidence            *json.RawMessage `json:"evidence,omitempty"`
}

type TransitionAssetProcessRunRequest struct {
	TargetStatus        string           `json:"targetStatus"`
	Comment             *string          `json:"comment,omitempty"`
	Decision            *string          `json:"decision,omitempty"`
	Evidence            *json.RawMessage `json:"evidence,omitempty"`
	AssetID             *uuid.UUID       `json:"assetId,omitempty"`
	AssignedAssetID     *uuid.UUID       `json:"assignedAssetId,omitempty"`
	StopGapAssetID      *uuid.UUID       `json:"stopGapAssetId,omitempty"`
	ResponsibleUserID   *uuid.UUID       `json:"responsibleUserId,omitempty"`
	AccountableUserID   *uuid.UUID       `json:"accountableUserId,omitempty"`
	ApprovalStatus      *string          `json:"approvalStatus,omitempty"`
	AvailabilityStatus  *string          `json:"availabilityStatus,omitempty"`
	RequesterStatus     *string          `json:"requesterStatus,omitempty"`
	ReplacementEligible *bool            `json:"replacementEligible,omitempty"`
	BuybackOption       *bool            `json:"buybackOption,omitempty"`
	BuybackApproved     *bool            `json:"buybackApproved,omitempty"`
	ExitReason          *string          `json:"exitReason,omitempty"`
	WarrantyStatus      *string          `json:"warrantyStatus,omitempty"`
	DataWipeConfirmed   *bool            `json:"dataWipeConfirmed,omitempty"`
	DeliverySigned      *bool            `json:"deliverySigned,omitempty"`
	ReturnSigned        *bool            `json:"returnSigned,omitempty"`
	Details             *json.RawMessage `json:"details,omitempty"`
}

package vault

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// RBAC permission constants
// ──────────────────────────────────────────────

const (
	PermDocumentsView    = "documents.view"
	PermDocumentsManage  = "documents.manage"
	PermDocumentsShare   = "documents.share"
	PermDocumentsApprove = "documents.approve"
	PermDocumentsDelete  = "documents.delete"
	PermDocumentsAdmin   = "documents.admin"
)

// ──────────────────────────────────────────────
// Access-level policy enforcement
// ──────────────────────────────────────────────

// AccessLevelPolicy defines behavioral rules for each access level.
type AccessLevelPolicy struct {
	VisibleInList          bool // appears in general list/search for org-scoped users
	RequiresExplicitAccess bool // only visible to owner/uploader/shared users/admin
	AllowRoleSharing       bool // can be shared via role (not just specific user)
	RequiresShareExpiry    bool // shares must have an expiry date
}

// AccessLevelPolicies maps each access level to its enforcement rules.
var AccessLevelPolicies = map[string]AccessLevelPolicy{
	AccessLevelPublic:       {VisibleInList: true, RequiresExplicitAccess: false, AllowRoleSharing: true, RequiresShareExpiry: false},
	AccessLevelInternal:     {VisibleInList: true, RequiresExplicitAccess: false, AllowRoleSharing: true, RequiresShareExpiry: false},
	AccessLevelRestricted:   {VisibleInList: false, RequiresExplicitAccess: true, AllowRoleSharing: true, RequiresShareExpiry: true},
	AccessLevelConfidential: {VisibleInList: false, RequiresExplicitAccess: true, AllowRoleSharing: false, RequiresShareExpiry: true},
}

// ──────────────────────────────────────────────
// Document status constants (lifecycle states)
// ──────────────────────────────────────────────

const (
	DocumentStatusDraft       = "draft"
	DocumentStatusActive      = "active"
	DocumentStatusUnderReview = "under_review"
	DocumentStatusApproved    = "approved"
	DocumentStatusRejected    = "rejected"
	DocumentStatusArchived    = "archived"
	DocumentStatusExpired     = "expired"
	DocumentStatusDeleted     = "deleted"
	DocumentStatusRestored    = "restored"
)

// ValidStatuses maps valid document lifecycle states.
var ValidStatuses = map[string]bool{
	DocumentStatusDraft:       true,
	DocumentStatusActive:      true,
	DocumentStatusUnderReview: true,
	DocumentStatusApproved:    true,
	DocumentStatusRejected:    true,
	DocumentStatusArchived:    true,
	DocumentStatusExpired:     true,
	DocumentStatusDeleted:     true,
	DocumentStatusRestored:    true,
}

// ValidTransitions defines which status transitions are allowed.
// Key = from-status, value = set of allowed to-statuses.
var ValidTransitions = map[string]map[string]bool{
	DocumentStatusDraft:       {DocumentStatusActive: true, DocumentStatusDeleted: true},
	DocumentStatusActive:      {DocumentStatusUnderReview: true, DocumentStatusArchived: true, DocumentStatusDeleted: true},
	DocumentStatusUnderReview: {DocumentStatusApproved: true, DocumentStatusRejected: true, DocumentStatusActive: true},
	DocumentStatusApproved:    {DocumentStatusActive: true, DocumentStatusArchived: true},
	DocumentStatusRejected:    {DocumentStatusActive: true, DocumentStatusDraft: true, DocumentStatusDeleted: true},
	DocumentStatusArchived:    {DocumentStatusRestored: true},
	DocumentStatusExpired:     {DocumentStatusRestored: true, DocumentStatusDeleted: true},
	DocumentStatusDeleted:     {DocumentStatusRestored: true},
	DocumentStatusRestored:    {DocumentStatusActive: true, DocumentStatusDraft: true},
}

// ──────────────────────────────────────────────
// Document classification constants
// ──────────────────────────────────────────────

const (
	ClassificationAuditEvidence = "audit_evidence"
	ClassificationOperational   = "operational"
	ClassificationConfiguration = "configuration"
	ClassificationPolicy        = "policy"
	ClassificationReport        = "report"
	ClassificationTransient     = "transient"
)

// ValidClassifications maps valid classification values.
var ValidClassifications = map[string]bool{
	ClassificationAuditEvidence: true,
	ClassificationOperational:   true,
	ClassificationConfiguration: true,
	ClassificationPolicy:        true,
	ClassificationReport:        true,
	ClassificationTransient:     true,
}

// ──────────────────────────────────────────────
// Document access level constants
// ──────────────────────────────────────────────

const (
	AccessLevelPublic       = "public"
	AccessLevelInternal     = "internal"
	AccessLevelRestricted   = "restricted"
	AccessLevelConfidential = "confidential"
)

// ValidAccessLevels maps valid access level values.
var ValidAccessLevels = map[string]bool{
	AccessLevelPublic:       true,
	AccessLevelInternal:     true,
	AccessLevelRestricted:   true,
	AccessLevelConfidential: true,
}

// ──────────────────────────────────────────────
// Share permission constants
// ──────────────────────────────────────────────

const (
	PermissionView     = "view"
	PermissionDownload = "download"
	PermissionEdit     = "edit"
	PermissionShare    = "share"
	PermissionApprove  = "approve"
)

// ValidPermissions maps valid share permission values.
var ValidPermissions = map[string]bool{
	PermissionView:     true,
	PermissionDownload: true,
	PermissionEdit:     true,
	PermissionShare:    true,
	PermissionApprove:  true,
}

// ──────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────

// VaultDocument represents a document stored in the vault with joined metadata.
type VaultDocument struct {
	ID               uuid.UUID  `json:"id"`
	TenantID         uuid.UUID  `json:"tenantId"`
	Title            string     `json:"title"`
	Description      *string    `json:"description"`
	FileKey          string     `json:"fileKey"`
	FileName         string     `json:"fileName"`
	ContentType      string     `json:"contentType"`
	SizeBytes        int64      `json:"sizeBytes"`
	ChecksumSHA256   string     `json:"checksumSha256"`
	Classification   string     `json:"classification"`
	RetentionUntil   *time.Time `json:"retentionUntil"`
	Tags             []string   `json:"tags"`
	FolderID         *uuid.UUID `json:"folderId"`
	Version          int        `json:"version"`
	ParentDocumentID *uuid.UUID `json:"parentDocumentId"`
	IsLatest         bool       `json:"isLatest"`
	LockedBy         *uuid.UUID `json:"lockedBy"`
	LockedAt         *time.Time `json:"lockedAt"`
	Status           string     `json:"status"`
	AccessLevel      string     `json:"accessLevel"`
	UploadedBy       uuid.UUID  `json:"uploadedBy"`
	OrgUnitID        *uuid.UUID `json:"orgUnitId,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`

	// Extended DMS metadata
	OwnerID        *uuid.UUID `json:"ownerId,omitempty"`
	DocumentCode   *string    `json:"documentCode,omitempty"`
	SourceModule   *string    `json:"sourceModule,omitempty"`
	SourceEntityID *uuid.UUID `json:"sourceEntityId,omitempty"`
	EffectiveDate  *time.Time `json:"effectiveDate,omitempty"`
	ExpiryDate     *time.Time `json:"expiryDate,omitempty"`
	Confidential   bool       `json:"confidential"`
	LegalHold      bool       `json:"legalHold"`
	ArchivedAt     *time.Time `json:"archivedAt,omitempty"`
	ArchivedBy     *uuid.UUID `json:"archivedBy,omitempty"`
	DeletedAt      *time.Time `json:"deletedAt,omitempty"`
	DeletedBy      *uuid.UUID `json:"deletedBy,omitempty"`

	// Joined fields
	UploaderName string  `json:"uploaderName"`
	FolderName   *string `json:"folderName"`
	LockedByName *string `json:"lockedByName"`
	OwnerName    *string `json:"ownerName,omitempty"`
}

// DocumentFolder represents a folder in the document vault.
type DocumentFolder struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	ParentID    *uuid.UUID `json:"parentId"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Path        string     `json:"path"`
	Color       *string    `json:"color"`
	CreatedBy   uuid.UUID  `json:"createdBy"`
	OrgUnitID   *uuid.UUID `json:"orgUnitId,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`

	// Computed
	DocumentCount int              `json:"documentCount"`
	Children      []DocumentFolder `json:"children,omitempty"`
}

// DocumentAccessLogEntry represents a single entry in the document access log.
type DocumentAccessLogEntry struct {
	ID         uuid.UUID `json:"id"`
	DocumentID uuid.UUID `json:"documentId"`
	TenantID   uuid.UUID `json:"tenantId"`
	UserID     uuid.UUID `json:"userId"`
	Action     string    `json:"action"`
	IPAddress  string    `json:"ipAddress"`
	CreatedAt  time.Time `json:"createdAt"`

	// Joined
	UserName string `json:"userName"`
}

// DocumentShare represents a document sharing record.
type DocumentShare struct {
	ID               uuid.UUID  `json:"id"`
	DocumentID       uuid.UUID  `json:"documentId"`
	TenantID         uuid.UUID  `json:"tenantId"`
	SharedWithUserID *uuid.UUID `json:"sharedWithUserId"`
	SharedWithRole   *string    `json:"sharedWithRole"`
	Permission       string     `json:"permission"`
	SharedBy         uuid.UUID  `json:"sharedBy"`
	ExpiresAt        *time.Time `json:"expiresAt"`
	RevokedAt        *time.Time `json:"revokedAt,omitempty"`
	RevokedBy        *uuid.UUID `json:"revokedBy,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`

	// Joined
	SharedWithName string `json:"sharedWithName"`
	SharedByName   string `json:"sharedByName"`
}

// DocumentComment represents a comment on a document.
type DocumentComment struct {
	ID         uuid.UUID  `json:"id"`
	DocumentID uuid.UUID  `json:"documentId"`
	TenantID   uuid.UUID  `json:"tenantId"`
	UserID     uuid.UUID  `json:"userId"`
	Content    string     `json:"content"`
	ParentID   *uuid.UUID `json:"parentId,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`

	// Joined
	UserName string `json:"userName"`
}

// DocumentLifecycleEntry represents a lifecycle status transition log entry.
type DocumentLifecycleEntry struct {
	ID         uuid.UUID `json:"id"`
	DocumentID uuid.UUID `json:"documentId"`
	TenantID   uuid.UUID `json:"tenantId"`
	FromStatus string    `json:"fromStatus"`
	ToStatus   string    `json:"toStatus"`
	ChangedBy  uuid.UUID `json:"changedBy"`
	Reason     *string   `json:"reason,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`

	// Joined
	ChangedByName string `json:"changedByName"`
}

// VaultStats holds aggregate statistics for the document vault.
type VaultStats struct {
	TotalDocuments   int64            `json:"totalDocuments"`
	TotalSizeBytes   int64            `json:"totalSizeBytes"`
	TotalFolders     int64            `json:"totalFolders"`
	ByClassification map[string]int64 `json:"byClassification"`
	ByStatus         map[string]int64 `json:"byStatus"`
	RecentUploads    int64            `json:"recentUploads"`
}

// ──────────────────────────────────────────────
// Request types
// ──────────────────────────────────────────────

// CreateFolderRequest is the payload for creating a document folder.
type CreateFolderRequest struct {
	Name        string     `json:"name" validate:"required"`
	ParentID    *uuid.UUID `json:"parentId,omitempty"`
	Description *string    `json:"description,omitempty"`
	Color       *string    `json:"color,omitempty"`
}

// UpdateFolderRequest is the payload for updating a document folder.
type UpdateFolderRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
}

// UpdateDocumentRequest is the payload for updating document metadata.
type UpdateDocumentRequest struct {
	Title          *string    `json:"title"`
	Description    *string    `json:"description"`
	Tags           []string   `json:"tags"`
	Classification *string    `json:"classification"`
	AccessLevel    *string    `json:"accessLevel"`
	FolderID       *uuid.UUID `json:"folderId"`
	DocumentCode   *string    `json:"documentCode"`
	OwnerID        *uuid.UUID `json:"ownerId"`
	EffectiveDate  *time.Time `json:"effectiveDate"`
	ExpiryDate     *time.Time `json:"expiryDate"`
	Confidential   *bool      `json:"confidential"`
	RetentionUntil *time.Time `json:"retentionUntil"`
}

// ShareDocumentRequest is the payload for sharing a document.
type ShareDocumentRequest struct {
	SharedWithUserID *uuid.UUID `json:"sharedWithUserId,omitempty"`
	SharedWithRole   *string    `json:"sharedWithRole,omitempty"`
	Permission       string     `json:"permission" validate:"required"`
	ExpiresAt        *time.Time `json:"expiresAt,omitempty"`
}

// MoveDocumentRequest is the payload for moving a document to a folder.
type MoveDocumentRequest struct {
	FolderID *uuid.UUID `json:"folderId"`
}

// TransitionStatusRequest is the payload for transitioning a document lifecycle status.
type TransitionStatusRequest struct {
	ToStatus string  `json:"toStatus" validate:"required"`
	Reason   *string `json:"reason,omitempty"`
}

// AddCommentRequest is the payload for adding a comment to a document.
type AddCommentRequest struct {
	Content  string     `json:"content" validate:"required"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
}

// ──────────────────────────────────────────────
// Compliance and sharing query types
// ──────────────────────────────────────────────

// ComplianceDocument is a lightweight document view for compliance reports.
type ComplianceDocument struct {
	ID             uuid.UUID  `json:"id"`
	Title          string     `json:"title"`
	Classification string     `json:"classification"`
	AccessLevel    string     `json:"accessLevel"`
	Status         string     `json:"status"`
	ExpiryDate     *time.Time `json:"expiryDate"`
	RetentionUntil *time.Time `json:"retentionUntil"`
	OwnerName      *string    `json:"ownerName"`
	OrgUnitID      *uuid.UUID `json:"orgUnitId"`
	CreatedAt      time.Time  `json:"createdAt"`
}

// RetentionReport holds aggregate retention and compliance statistics.
type RetentionReport struct {
	TotalWithExpiry       int64 `json:"totalWithExpiry"`
	ExpiredCount          int64 `json:"expiredCount"`
	ExpiringSoon30Days    int64 `json:"expiringSoon30Days"`
	TotalWithRetention    int64 `json:"totalWithRetention"`
	RetentionActiveCount  int64 `json:"retentionActiveCount"`
	RetentionExpiredCount int64 `json:"retentionExpiredCount"`
	LegalHoldCount        int64 `json:"legalHoldCount"`
}

// SharedWithMeDocument extends VaultDocument with share metadata.
type SharedWithMeDocument struct {
	VaultDocument
	SharePermission string     `json:"sharePermission"`
	SharedByName    string     `json:"sharedBy"`
	SharedAt        time.Time  `json:"sharedAt"`
	ShareExpiresAt  *time.Time `json:"shareExpiresAt"`
}

// ──────────────────────────────────────────────
// SQL column lists (DRY helpers for scan)
// ──────────────────────────────────────────────

// documentColumns is the SELECT column list used across all document queries.
const documentColumns = `d.id, d.tenant_id, d.title, d.description, d.file_key,
	d.content_type, d.size_bytes, d.checksum_sha256, d.classification,
	d.retention_until, d.tags, d.folder_id, d.version,
	d.parent_document_id, d.is_latest, d.locked_by, d.locked_at,
	d.status, d.access_level, d.uploaded_by, d.org_unit_id, d.created_at, d.updated_at,
	d.owner_id, d.document_code, d.source_module, d.source_entity_id,
	d.effective_date, d.expiry_date, d.confidential, d.legal_hold,
	d.archived_at, d.archived_by, d.deleted_at, d.deleted_by,
	COALESCE(u.display_name, ''),
	f.name,
	lu.display_name,
	ou.display_name`

// documentJoins is the FROM/JOIN clause used across all document queries.
const documentJoins = `FROM documents d
	LEFT JOIN users u ON u.id = d.uploaded_by
	LEFT JOIN document_folders f ON f.id = d.folder_id
	LEFT JOIN users lu ON lu.id = d.locked_by
	LEFT JOIN users ou ON ou.id = d.owner_id`

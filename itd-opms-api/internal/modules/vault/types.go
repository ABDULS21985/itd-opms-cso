package vault

import (
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Document status constants
// ──────────────────────────────────────────────

const (
	DocumentStatusActive  = "active"
	DocumentStatusDeleted = "deleted"
)

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
)

// ValidPermissions maps valid share permission values.
var ValidPermissions = map[string]bool{
	PermissionView:     true,
	PermissionDownload: true,
	PermissionEdit:     true,
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

	// Joined fields
	UploaderName string  `json:"uploaderName"`
	FolderName   *string `json:"folderName"`
	LockedByName *string `json:"lockedByName"`
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
	CreatedAt        time.Time  `json:"createdAt"`

	// Joined
	SharedWithName string `json:"sharedWithName"`
	SharedByName   string `json:"sharedByName"`
}

// VaultStats holds aggregate statistics for the document vault.
type VaultStats struct {
	TotalDocuments   int64            `json:"totalDocuments"`
	TotalSizeBytes   int64            `json:"totalSizeBytes"`
	TotalFolders     int64            `json:"totalFolders"`
	ByClassification map[string]int64 `json:"byClassification"`
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

package vault

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Document status constants
// ──────────────────────────────────────────────

func TestDocumentStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Draft", DocumentStatusDraft, "draft"},
		{"Active", DocumentStatusActive, "active"},
		{"UnderReview", DocumentStatusUnderReview, "under_review"},
		{"Approved", DocumentStatusApproved, "approved"},
		{"Rejected", DocumentStatusRejected, "rejected"},
		{"Archived", DocumentStatusArchived, "archived"},
		{"Expired", DocumentStatusExpired, "expired"},
		{"Deleted", DocumentStatusDeleted, "deleted"},
		{"Restored", DocumentStatusRestored, "restored"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidStatuses(t *testing.T) {
	expected := []string{
		"draft", "active", "under_review", "approved", "rejected",
		"archived", "expired", "deleted", "restored",
	}
	for _, v := range expected {
		if !ValidStatuses[v] {
			t.Errorf("expected %q to be a valid status", v)
		}
	}

	if ValidStatuses["invalid"] {
		t.Errorf("expected 'invalid' to not be a valid status")
	}

	if len(ValidStatuses) != len(expected) {
		t.Errorf("expected %d statuses, got %d", len(expected), len(ValidStatuses))
	}
}

// ──────────────────────────────────────────────
// Status transitions
// ──────────────────────────────────────────────

func TestValidTransitions(t *testing.T) {
	tests := []struct {
		from    string
		to      string
		allowed bool
	}{
		{DocumentStatusDraft, DocumentStatusActive, true},
		{DocumentStatusDraft, DocumentStatusDeleted, true},
		{DocumentStatusDraft, DocumentStatusArchived, false},
		{DocumentStatusActive, DocumentStatusUnderReview, true},
		{DocumentStatusActive, DocumentStatusArchived, true},
		{DocumentStatusActive, DocumentStatusDeleted, true},
		{DocumentStatusActive, DocumentStatusApproved, false},
		{DocumentStatusUnderReview, DocumentStatusApproved, true},
		{DocumentStatusUnderReview, DocumentStatusRejected, true},
		{DocumentStatusUnderReview, DocumentStatusActive, true},
		{DocumentStatusApproved, DocumentStatusActive, true},
		{DocumentStatusApproved, DocumentStatusArchived, true},
		{DocumentStatusApproved, DocumentStatusDeleted, false},
		{DocumentStatusRejected, DocumentStatusActive, true},
		{DocumentStatusRejected, DocumentStatusDraft, true},
		{DocumentStatusRejected, DocumentStatusDeleted, true},
		{DocumentStatusArchived, DocumentStatusRestored, true},
		{DocumentStatusArchived, DocumentStatusDeleted, false},
		{DocumentStatusExpired, DocumentStatusRestored, true},
		{DocumentStatusExpired, DocumentStatusDeleted, true},
		{DocumentStatusDeleted, DocumentStatusRestored, true},
		{DocumentStatusDeleted, DocumentStatusActive, false},
		{DocumentStatusRestored, DocumentStatusActive, true},
		{DocumentStatusRestored, DocumentStatusDraft, true},
	}

	for _, tt := range tests {
		t.Run(tt.from+"→"+tt.to, func(t *testing.T) {
			allowed := ValidTransitions[tt.from][tt.to]
			if allowed != tt.allowed {
				t.Errorf("transition %s→%s: expected allowed=%v, got %v", tt.from, tt.to, tt.allowed, allowed)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Classification constants
// ──────────────────────────────────────────────

func TestClassificationConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"AuditEvidence", ClassificationAuditEvidence, "audit_evidence"},
		{"Operational", ClassificationOperational, "operational"},
		{"Configuration", ClassificationConfiguration, "configuration"},
		{"Policy", ClassificationPolicy, "policy"},
		{"Report", ClassificationReport, "report"},
		{"Transient", ClassificationTransient, "transient"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidClassifications(t *testing.T) {
	expected := []string{
		"audit_evidence", "operational", "configuration",
		"policy", "report", "transient",
	}
	for _, v := range expected {
		if !ValidClassifications[v] {
			t.Errorf("expected %q to be a valid classification", v)
		}
	}

	if ValidClassifications["invalid"] {
		t.Errorf("expected 'invalid' to not be a valid classification")
	}

	if len(ValidClassifications) != len(expected) {
		t.Errorf("expected %d classifications, got %d", len(expected), len(ValidClassifications))
	}
}

// ──────────────────────────────────────────────
// Access level constants
// ──────────────────────────────────────────────

func TestAccessLevelConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Public", AccessLevelPublic, "public"},
		{"Internal", AccessLevelInternal, "internal"},
		{"Restricted", AccessLevelRestricted, "restricted"},
		{"Confidential", AccessLevelConfidential, "confidential"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidAccessLevels(t *testing.T) {
	expected := []string{"public", "internal", "restricted", "confidential"}
	for _, v := range expected {
		if !ValidAccessLevels[v] {
			t.Errorf("expected %q to be a valid access level", v)
		}
	}

	if ValidAccessLevels["secret"] {
		t.Errorf("expected 'secret' to not be a valid access level")
	}

	if len(ValidAccessLevels) != len(expected) {
		t.Errorf("expected %d access levels, got %d", len(expected), len(ValidAccessLevels))
	}
}

// ──────────────────────────────────────────────
// Permission constants
// ──────────────────────────────────────────────

func TestPermissionConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"View", PermissionView, "view"},
		{"Download", PermissionDownload, "download"},
		{"Edit", PermissionEdit, "edit"},
		{"Share", PermissionShare, "share"},
		{"Approve", PermissionApprove, "approve"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidPermissions(t *testing.T) {
	expected := []string{"view", "download", "edit", "share", "approve"}
	for _, v := range expected {
		if !ValidPermissions[v] {
			t.Errorf("expected %q to be a valid permission", v)
		}
	}

	if ValidPermissions["admin"] {
		t.Errorf("expected 'admin' to not be a valid permission")
	}

	if len(ValidPermissions) != len(expected) {
		t.Errorf("expected %d permissions, got %d", len(expected), len(ValidPermissions))
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestVaultDocumentJSONRoundTrip(t *testing.T) {
	desc := "Server config"
	folderName := "Infrastructure"
	ownerName := "Jane Owner"
	docCode := "DOC-2024-001"
	now := time.Now().UTC().Truncate(time.Second)
	original := VaultDocument{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		Title:          "Server Setup Guide",
		Description:    &desc,
		FileKey:        "docs/server-setup.pdf",
		FileName:       "server-setup.pdf",
		ContentType:    "application/pdf",
		SizeBytes:      1048576,
		ChecksumSHA256: "abc123def456",
		Classification: ClassificationOperational,
		Tags:           []string{"infrastructure", "setup"},
		Version:        1,
		IsLatest:       true,
		Status:         DocumentStatusActive,
		AccessLevel:    AccessLevelInternal,
		UploadedBy:     uuid.New(),
		CreatedAt:      now,
		UpdatedAt:      now,
		OwnerID:        ptrUUID(uuid.New()),
		DocumentCode:   &docCode,
		Confidential:   false,
		LegalHold:      false,
		UploaderName:   "Jane Admin",
		FolderName:     &folderName,
		OwnerName:      &ownerName,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal VaultDocument: %v", err)
	}

	var decoded VaultDocument
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal VaultDocument: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: expected %q, got %q", original.Title, decoded.Title)
	}
	if decoded.FileName != original.FileName {
		t.Errorf("FileName mismatch")
	}
	if decoded.SizeBytes != 1048576 {
		t.Errorf("SizeBytes mismatch: expected 1048576, got %d", decoded.SizeBytes)
	}
	if decoded.Version != 1 {
		t.Errorf("Version mismatch: expected 1, got %d", decoded.Version)
	}
	if !decoded.IsLatest {
		t.Errorf("IsLatest mismatch: expected true")
	}
	if decoded.Classification != ClassificationOperational {
		t.Errorf("Classification mismatch")
	}
	if decoded.AccessLevel != AccessLevelInternal {
		t.Errorf("AccessLevel mismatch")
	}
	if len(decoded.Tags) != 2 || decoded.Tags[0] != "infrastructure" {
		t.Errorf("Tags mismatch: got %v", decoded.Tags)
	}
	if decoded.UploaderName != "Jane Admin" {
		t.Errorf("UploaderName mismatch")
	}
	if decoded.FolderName == nil || *decoded.FolderName != folderName {
		t.Errorf("FolderName mismatch")
	}
	if decoded.DocumentCode == nil || *decoded.DocumentCode != docCode {
		t.Errorf("DocumentCode mismatch")
	}
	if decoded.OwnerName == nil || *decoded.OwnerName != ownerName {
		t.Errorf("OwnerName mismatch")
	}
	if decoded.Confidential != false {
		t.Errorf("Confidential mismatch: expected false")
	}
	if decoded.LegalHold != false {
		t.Errorf("LegalHold mismatch: expected false")
	}
}

func TestDocumentFolderJSONRoundTrip(t *testing.T) {
	desc := "Top level folder"
	color := "#3B82F6"
	now := time.Now().UTC().Truncate(time.Second)
	original := DocumentFolder{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		Name:          "Infrastructure",
		Description:   &desc,
		Path:          "/Infrastructure",
		Color:         &color,
		CreatedBy:     uuid.New(),
		CreatedAt:     now,
		UpdatedAt:     now,
		DocumentCount: 5,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal DocumentFolder: %v", err)
	}

	var decoded DocumentFolder
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal DocumentFolder: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != "Infrastructure" {
		t.Errorf("Name mismatch")
	}
	if decoded.Path != "/Infrastructure" {
		t.Errorf("Path mismatch")
	}
	if decoded.DocumentCount != 5 {
		t.Errorf("DocumentCount mismatch: expected 5, got %d", decoded.DocumentCount)
	}
	if decoded.Color == nil || *decoded.Color != color {
		t.Errorf("Color mismatch")
	}
}

func TestDocumentShareJSONRoundTrip(t *testing.T) {
	userID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	original := DocumentShare{
		ID:               uuid.New(),
		DocumentID:       uuid.New(),
		TenantID:         uuid.New(),
		SharedWithUserID: &userID,
		Permission:       PermissionDownload,
		SharedBy:         uuid.New(),
		CreatedAt:        now,
		SharedWithName:   "Bob User",
		SharedByName:     "Jane Admin",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal DocumentShare: %v", err)
	}

	var decoded DocumentShare
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal DocumentShare: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Permission != PermissionDownload {
		t.Errorf("Permission mismatch")
	}
	if decoded.SharedWithUserID == nil || *decoded.SharedWithUserID != userID {
		t.Errorf("SharedWithUserID mismatch")
	}
	if decoded.SharedWithName != "Bob User" {
		t.Errorf("SharedWithName mismatch")
	}
}

func TestDocumentCommentJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	original := DocumentComment{
		ID:         uuid.New(),
		DocumentID: uuid.New(),
		TenantID:   uuid.New(),
		UserID:     uuid.New(),
		Content:    "This document needs review.",
		CreatedAt:  now,
		UpdatedAt:  now,
		UserName:   "Jane Admin",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal DocumentComment: %v", err)
	}

	var decoded DocumentComment
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal DocumentComment: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Content != "This document needs review." {
		t.Errorf("Content mismatch: got %q", decoded.Content)
	}
	if decoded.UserName != "Jane Admin" {
		t.Errorf("UserName mismatch")
	}
}

func TestDocumentLifecycleEntryJSONRoundTrip(t *testing.T) {
	reason := "Approved after review"
	now := time.Now().UTC().Truncate(time.Second)
	original := DocumentLifecycleEntry{
		ID:            uuid.New(),
		DocumentID:    uuid.New(),
		TenantID:      uuid.New(),
		FromStatus:    DocumentStatusUnderReview,
		ToStatus:      DocumentStatusApproved,
		ChangedBy:     uuid.New(),
		Reason:        &reason,
		CreatedAt:     now,
		ChangedByName: "Jane Admin",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal DocumentLifecycleEntry: %v", err)
	}

	var decoded DocumentLifecycleEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal DocumentLifecycleEntry: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.FromStatus != DocumentStatusUnderReview {
		t.Errorf("FromStatus mismatch")
	}
	if decoded.ToStatus != DocumentStatusApproved {
		t.Errorf("ToStatus mismatch")
	}
	if decoded.Reason == nil || *decoded.Reason != reason {
		t.Errorf("Reason mismatch")
	}
	if decoded.ChangedByName != "Jane Admin" {
		t.Errorf("ChangedByName mismatch")
	}
}

func TestVaultStatsJSONRoundTrip(t *testing.T) {
	original := VaultStats{
		TotalDocuments: 100,
		TotalSizeBytes: 1073741824,
		TotalFolders:   10,
		ByClassification: map[string]int64{
			"operational": 50,
			"policy":      30,
			"report":      20,
		},
		ByStatus: map[string]int64{
			"active":   80,
			"archived": 15,
			"draft":    5,
		},
		RecentUploads: 5,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal VaultStats: %v", err)
	}

	var decoded VaultStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal VaultStats: %v", err)
	}

	if decoded.TotalDocuments != 100 {
		t.Errorf("TotalDocuments mismatch: expected 100, got %d", decoded.TotalDocuments)
	}
	if decoded.TotalSizeBytes != 1073741824 {
		t.Errorf("TotalSizeBytes mismatch")
	}
	if decoded.TotalFolders != 10 {
		t.Errorf("TotalFolders mismatch")
	}
	if decoded.ByClassification["operational"] != 50 {
		t.Errorf("ByClassification[operational] mismatch")
	}
	if decoded.ByStatus["active"] != 80 {
		t.Errorf("ByStatus[active] mismatch")
	}
	if decoded.ByStatus["archived"] != 15 {
		t.Errorf("ByStatus[archived] mismatch")
	}
	if decoded.RecentUploads != 5 {
		t.Errorf("RecentUploads mismatch")
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateFolderRequestJSON(t *testing.T) {
	body := `{"name": "Policies", "description": "Company policies"}`

	var req CreateFolderRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateFolderRequest: %v", err)
	}

	if req.Name != "Policies" {
		t.Errorf("Name mismatch")
	}
}

func TestShareDocumentRequestJSON(t *testing.T) {
	body := `{
		"sharedWithUserId": "11111111-1111-1111-1111-111111111111",
		"permission": "download"
	}`

	var req ShareDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal ShareDocumentRequest: %v", err)
	}

	if req.Permission != "download" {
		t.Errorf("Permission mismatch")
	}
	if req.SharedWithUserID == nil || req.SharedWithUserID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("SharedWithUserID mismatch")
	}
}

func TestMoveDocumentRequestJSON(t *testing.T) {
	body := `{"folderId": "22222222-2222-2222-2222-222222222222"}`

	var req MoveDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal MoveDocumentRequest: %v", err)
	}

	if req.FolderID == nil || req.FolderID.String() != "22222222-2222-2222-2222-222222222222" {
		t.Errorf("FolderID mismatch")
	}
}

func TestTransitionStatusRequestJSON(t *testing.T) {
	body := `{"toStatus": "approved", "reason": "Looks good"}`

	var req TransitionStatusRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal TransitionStatusRequest: %v", err)
	}

	if req.ToStatus != "approved" {
		t.Errorf("ToStatus mismatch")
	}
	if req.Reason == nil || *req.Reason != "Looks good" {
		t.Errorf("Reason mismatch")
	}
}

func TestAddCommentRequestJSON(t *testing.T) {
	body := `{"content": "Please review this", "parentId": "33333333-3333-3333-3333-333333333333"}`

	var req AddCommentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal AddCommentRequest: %v", err)
	}

	if req.Content != "Please review this" {
		t.Errorf("Content mismatch")
	}
	if req.ParentID == nil || req.ParentID.String() != "33333333-3333-3333-3333-333333333333" {
		t.Errorf("ParentID mismatch")
	}
}

func TestUpdateDocumentRequestJSON(t *testing.T) {
	body := `{
		"title": "Updated Title",
		"documentCode": "DOC-2024-001",
		"confidential": true,
		"effectiveDate": "2024-01-15T00:00:00Z"
	}`

	var req UpdateDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateDocumentRequest: %v", err)
	}

	if req.Title == nil || *req.Title != "Updated Title" {
		t.Errorf("Title mismatch")
	}
	if req.DocumentCode == nil || *req.DocumentCode != "DOC-2024-001" {
		t.Errorf("DocumentCode mismatch")
	}
	if req.Confidential == nil || *req.Confidential != true {
		t.Errorf("Confidential mismatch")
	}
	if req.EffectiveDate == nil {
		t.Errorf("EffectiveDate should not be nil")
	}
}

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

func ptrUUID(id uuid.UUID) *uuid.UUID {
	return &id
}

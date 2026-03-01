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
		{"Active", DocumentStatusActive, "active"},
		{"Deleted", DocumentStatusDeleted, "deleted"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
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
	expected := []string{"view", "download", "edit"}
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
		UploaderName:   "Jane Admin",
		FolderName:     &folderName,
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

package vault

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ══════════════════════════════════════════════
// AllowedContentTypes validation
// ══════════════════════════════════════════════

func TestAllowedContentTypes(t *testing.T) {
	// Positive: all expected types must be allowed.
	expected := []string{
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-powerpoint",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"image/png",
		"image/jpeg",
		"image/gif",
		"image/webp",
		"text/plain",
		"text/csv",
		"application/zip",
		"application/x-zip-compressed",
	}
	for _, ct := range expected {
		if !AllowedContentTypes[ct] {
			t.Errorf("expected content type %q to be allowed", ct)
		}
	}

	// Negative: disallowed types must not be present.
	disallowed := []string{
		"application/octet-stream",
		"text/html",
		"application/javascript",
		"application/x-executable",
		"application/x-shellscript",
	}
	for _, ct := range disallowed {
		if AllowedContentTypes[ct] {
			t.Errorf("expected content type %q to NOT be allowed", ct)
		}
	}
}

func TestMaxFileSize(t *testing.T) {
	expected := int64(50 << 20) // 50 MB
	if MaxFileSize != expected {
		t.Errorf("expected MaxFileSize to be %d, got %d", expected, MaxFileSize)
	}
}

// ══════════════════════════════════════════════
// Sharing governance — policy enforcement
// ══════════════════════════════════════════════

func TestShareDocumentRequest_JSONDecode_WithExpiry(t *testing.T) {
	body := `{
		"sharedWithUserId": "11111111-1111-1111-1111-111111111111",
		"permission": "download",
		"expiresAt": "2030-06-15T00:00:00Z"
	}`

	var req ShareDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.ExpiresAt == nil {
		t.Fatal("expiresAt should not be nil")
	}
	if req.ExpiresAt.Year() != 2030 {
		t.Errorf("expected year 2030, got %d", req.ExpiresAt.Year())
	}
}

func TestShareDocumentRequest_JSONDecode_RoleBased(t *testing.T) {
	body := `{
		"sharedWithRole": "supervisor",
		"permission": "view"
	}`

	var req ShareDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.SharedWithUserID != nil {
		t.Errorf("SharedWithUserID should be nil for role-based share")
	}
	if req.SharedWithRole == nil || *req.SharedWithRole != "supervisor" {
		t.Errorf("SharedWithRole mismatch")
	}
}

func TestShareDocumentRequest_JSONDecode_NoTarget(t *testing.T) {
	body := `{"permission": "view"}`

	var req ShareDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// Both targets nil — the service layer should reject this.
	if req.SharedWithUserID != nil || req.SharedWithRole != nil {
		t.Errorf("expected both targets to be nil")
	}
}

// ══════════════════════════════════════════════
// Access-level policy enforcement logic
// ══════════════════════════════════════════════

func TestAccessLevelPolicies_CompleteCoverage(t *testing.T) {
	// Every valid access level must have a policy entry.
	for level := range ValidAccessLevels {
		if _, ok := AccessLevelPolicies[level]; !ok {
			t.Errorf("missing AccessLevelPolicy for %q", level)
		}
	}

	// Restricted: must require explicit access but allow role sharing.
	rp := AccessLevelPolicies[AccessLevelRestricted]
	if !rp.RequiresExplicitAccess {
		t.Error("restricted: RequiresExplicitAccess should be true")
	}
	if !rp.AllowRoleSharing {
		t.Error("restricted: AllowRoleSharing should be true")
	}
	if !rp.RequiresShareExpiry {
		t.Error("restricted: RequiresShareExpiry should be true")
	}

	// Confidential: must NOT allow role sharing.
	cp := AccessLevelPolicies[AccessLevelConfidential]
	if cp.AllowRoleSharing {
		t.Error("confidential: AllowRoleSharing should be false")
	}
	if !cp.RequiresShareExpiry {
		t.Error("confidential: RequiresShareExpiry should be true")
	}
}

// ══════════════════════════════════════════════
// Workflow transition validation
// ══════════════════════════════════════════════

func TestValidTransitions_AllStatusesHaveEntries(t *testing.T) {
	for status := range ValidStatuses {
		if _, ok := ValidTransitions[status]; !ok {
			t.Errorf("ValidTransitions missing entry for status %q", status)
		}
	}
}

func TestValidTransitions_NoSelfTransitions(t *testing.T) {
	for from, toMap := range ValidTransitions {
		if toMap[from] {
			t.Errorf("self-transition allowed for status %q — this is likely a mistake", from)
		}
	}
}

func TestValidTransitions_DeletedOnlyRestored(t *testing.T) {
	// Deleted documents should only be restorable.
	allowed := ValidTransitions[DocumentStatusDeleted]
	if len(allowed) != 1 || !allowed[DocumentStatusRestored] {
		t.Errorf("deleted should only allow transition to restored, got %v", allowed)
	}
}

func TestValidTransitions_ArchivedOnlyRestored(t *testing.T) {
	allowed := ValidTransitions[DocumentStatusArchived]
	if len(allowed) != 1 || !allowed[DocumentStatusRestored] {
		t.Errorf("archived should only allow transition to restored, got %v", allowed)
	}
}

func TestValidTransitions_UnderReviewApproveRejectActive(t *testing.T) {
	allowed := ValidTransitions[DocumentStatusUnderReview]
	if !allowed[DocumentStatusApproved] || !allowed[DocumentStatusRejected] || !allowed[DocumentStatusActive] {
		t.Errorf("under_review should allow approved, rejected, active — got %v", allowed)
	}
	if len(allowed) != 3 {
		t.Errorf("under_review should have exactly 3 transitions, got %d", len(allowed))
	}
}

// ══════════════════════════════════════════════
// Compliance types — JSON round-trip
// ══════════════════════════════════════════════

func TestComplianceDocumentJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	expiry := now.Add(30 * 24 * time.Hour)
	retention := now.Add(365 * 24 * time.Hour)
	ownerName := "Jane Director"
	orgUnitID := uuid.New()

	original := ComplianceDocument{
		ID:             uuid.New(),
		Title:          "Budget Report Q4",
		Classification: ClassificationReport,
		AccessLevel:    AccessLevelRestricted,
		Status:         DocumentStatusActive,
		ExpiryDate:     &expiry,
		RetentionUntil: &retention,
		OwnerName:      &ownerName,
		OrgUnitID:      &orgUnitID,
		CreatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ComplianceDocument: %v", err)
	}

	var decoded ComplianceDocument
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ComplianceDocument: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != "Budget Report Q4" {
		t.Errorf("Title mismatch: %q", decoded.Title)
	}
	if decoded.Classification != ClassificationReport {
		t.Errorf("Classification mismatch")
	}
	if decoded.AccessLevel != AccessLevelRestricted {
		t.Errorf("AccessLevel mismatch")
	}
	if decoded.ExpiryDate == nil || decoded.ExpiryDate.Unix() != expiry.Unix() {
		t.Errorf("ExpiryDate mismatch")
	}
	if decoded.RetentionUntil == nil || decoded.RetentionUntil.Unix() != retention.Unix() {
		t.Errorf("RetentionUntil mismatch")
	}
	if decoded.OwnerName == nil || *decoded.OwnerName != ownerName {
		t.Errorf("OwnerName mismatch")
	}
}

func TestRetentionReportJSONRoundTrip(t *testing.T) {
	original := RetentionReport{
		TotalWithExpiry:       25,
		ExpiredCount:          3,
		ExpiringSoon30Days:    5,
		TotalWithRetention:    40,
		RetentionActiveCount:  35,
		RetentionExpiredCount: 5,
		LegalHoldCount:        2,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RetentionReport: %v", err)
	}

	var decoded RetentionReport
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RetentionReport: %v", err)
	}

	if decoded.TotalWithExpiry != 25 {
		t.Errorf("TotalWithExpiry mismatch: %d", decoded.TotalWithExpiry)
	}
	if decoded.ExpiredCount != 3 {
		t.Errorf("ExpiredCount mismatch")
	}
	if decoded.ExpiringSoon30Days != 5 {
		t.Errorf("ExpiringSoon30Days mismatch")
	}
	if decoded.TotalWithRetention != 40 {
		t.Errorf("TotalWithRetention mismatch")
	}
	if decoded.LegalHoldCount != 2 {
		t.Errorf("LegalHoldCount mismatch")
	}
}

func TestSharedWithMeDocumentJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	expires := now.Add(72 * time.Hour)

	original := SharedWithMeDocument{
		VaultDocument: VaultDocument{
			ID:             uuid.New(),
			TenantID:       uuid.New(),
			Title:          "Shared Policy Doc",
			FileKey:        "docs/policy.pdf",
			FileName:       "policy.pdf",
			ContentType:    "application/pdf",
			SizeBytes:      10240,
			ChecksumSHA256: "abc",
			Classification: ClassificationPolicy,
			Tags:           []string{},
			Version:        1,
			IsLatest:       true,
			Status:         DocumentStatusActive,
			AccessLevel:    AccessLevelRestricted,
			UploadedBy:     uuid.New(),
			CreatedAt:      now,
			UpdatedAt:      now,
			UploaderName:   "Admin",
		},
		SharePermission: PermissionDownload,
		SharedByName:    "Manager",
		SharedAt:        now,
		ShareExpiresAt:  &expires,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded SharedWithMeDocument
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.SharePermission != PermissionDownload {
		t.Errorf("SharePermission mismatch")
	}
	if decoded.SharedByName != "Manager" {
		t.Errorf("SharedByName mismatch")
	}
	if decoded.ShareExpiresAt == nil || decoded.ShareExpiresAt.Unix() != expires.Unix() {
		t.Errorf("ShareExpiresAt mismatch")
	}
	if decoded.Title != "Shared Policy Doc" {
		t.Errorf("Title mismatch")
	}
}

// ══════════════════════════════════════════════
// RBAC permission constants
// ══════════════════════════════════════════════

func TestRBACPermissionConstants(t *testing.T) {
	tests := []struct {
		name string
		got  string
		want string
	}{
		{"View", PermDocumentsView, "documents.view"},
		{"Manage", PermDocumentsManage, "documents.manage"},
		{"Share", PermDocumentsShare, "documents.share"},
		{"Approve", PermDocumentsApprove, "documents.approve"},
		{"Delete", PermDocumentsDelete, "documents.delete"},
		{"Admin", PermDocumentsAdmin, "documents.admin"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.want {
				t.Errorf("expected %q, got %q", tt.want, tt.got)
			}
		})
	}
}

// ══════════════════════════════════════════════
// SQL column/join constants integrity
// ══════════════════════════════════════════════

func TestDocumentColumns_NotEmpty(t *testing.T) {
	if documentColumns == "" {
		t.Fatal("documentColumns should not be empty")
	}
	if documentJoins == "" {
		t.Fatal("documentJoins should not be empty")
	}
}

// ══════════════════════════════════════════════
// UpdateDocumentRequest — edge cases
// ══════════════════════════════════════════════

func TestUpdateDocumentRequest_EmptyBody(t *testing.T) {
	body := `{}`

	var req UpdateDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// All fields should be nil/zero.
	if req.Title != nil || req.Description != nil || req.Classification != nil ||
		req.AccessLevel != nil || req.FolderID != nil || req.DocumentCode != nil ||
		req.OwnerID != nil || req.EffectiveDate != nil || req.ExpiryDate != nil ||
		req.Confidential != nil || req.RetentionUntil != nil {
		t.Error("empty body should result in all nil fields")
	}
	if req.Tags != nil {
		t.Error("Tags should be nil for empty body")
	}
}

func TestUpdateDocumentRequest_AllFieldsSet(t *testing.T) {
	body := `{
		"title": "New Title",
		"description": "New desc",
		"tags": ["tag1", "tag2"],
		"classification": "policy",
		"accessLevel": "restricted",
		"folderId": "11111111-1111-1111-1111-111111111111",
		"documentCode": "DOC-001",
		"ownerId": "22222222-2222-2222-2222-222222222222",
		"effectiveDate": "2025-01-01T00:00:00Z",
		"expiryDate": "2026-12-31T00:00:00Z",
		"confidential": true,
		"retentionUntil": "2030-01-01T00:00:00Z"
	}`

	var req UpdateDocumentRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Title == nil || *req.Title != "New Title" {
		t.Errorf("Title mismatch")
	}
	if len(req.Tags) != 2 {
		t.Errorf("expected 2 tags, got %d", len(req.Tags))
	}
	if req.Classification == nil || *req.Classification != "policy" {
		t.Errorf("Classification mismatch")
	}
	if req.AccessLevel == nil || *req.AccessLevel != "restricted" {
		t.Errorf("AccessLevel mismatch")
	}
	if req.Confidential == nil || *req.Confidential != true {
		t.Errorf("Confidential mismatch")
	}
	if req.RetentionUntil == nil {
		t.Errorf("RetentionUntil should not be nil")
	}
}

// ══════════════════════════════════════════════
// TransitionStatusRequest — edge cases
// ══════════════════════════════════════════════

func TestTransitionStatusRequest_WithoutReason(t *testing.T) {
	body := `{"toStatus": "active"}`

	var req TransitionStatusRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.ToStatus != "active" {
		t.Errorf("ToStatus mismatch")
	}
	if req.Reason != nil {
		t.Errorf("Reason should be nil when not provided")
	}
}

// ══════════════════════════════════════════════
// VaultDocument JSON — edge cases
// ══════════════════════════════════════════════

func TestVaultDocument_NullableTags(t *testing.T) {
	// When tags is JSON null, it should unmarshal to nil.
	body := `{"id":"11111111-1111-1111-1111-111111111111","tenantId":"22222222-2222-2222-2222-222222222222","title":"test","fileKey":"k","contentType":"text/plain","sizeBytes":0,"checksumSha256":"abc","classification":"operational","tags":null,"version":1,"isLatest":true,"status":"active","accessLevel":"internal","uploadedBy":"33333333-3333-3333-3333-333333333333","createdAt":"2025-01-01T00:00:00Z","updatedAt":"2025-01-01T00:00:00Z","uploaderName":"User","confidential":false,"legalHold":false}`

	var doc VaultDocument
	if err := json.Unmarshal([]byte(body), &doc); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	// Tags should be nil when JSON null (the service layer normalizes to []).
	if doc.Tags != nil {
		t.Errorf("expected nil tags for JSON null, got %v", doc.Tags)
	}
}

func TestVaultDocument_EmptyTags(t *testing.T) {
	body := `{"id":"11111111-1111-1111-1111-111111111111","tenantId":"22222222-2222-2222-2222-222222222222","title":"test","fileKey":"k","contentType":"text/plain","sizeBytes":0,"checksumSha256":"abc","classification":"operational","tags":[],"version":1,"isLatest":true,"status":"active","accessLevel":"internal","uploadedBy":"33333333-3333-3333-3333-333333333333","createdAt":"2025-01-01T00:00:00Z","updatedAt":"2025-01-01T00:00:00Z","uploaderName":"User","confidential":false,"legalHold":false}`

	var doc VaultDocument
	if err := json.Unmarshal([]byte(body), &doc); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if len(doc.Tags) != 0 {
		t.Errorf("expected empty tags slice, got %v", doc.Tags)
	}
}

// ══════════════════════════════════════════════
// Classification/AccessLevel validation completeness
// ══════════════════════════════════════════════

func TestAllClassificationsHaveConstants(t *testing.T) {
	expected := map[string]string{
		"audit_evidence": ClassificationAuditEvidence,
		"operational":    ClassificationOperational,
		"configuration":  ClassificationConfiguration,
		"policy":         ClassificationPolicy,
		"report":         ClassificationReport,
		"transient":      ClassificationTransient,
	}
	for value, constant := range expected {
		if constant != value {
			t.Errorf("constant for %q is %q — mismatch", value, constant)
		}
	}
}

func TestAllAccessLevelsHaveConstants(t *testing.T) {
	expected := map[string]string{
		"public":       AccessLevelPublic,
		"internal":     AccessLevelInternal,
		"restricted":   AccessLevelRestricted,
		"confidential": AccessLevelConfidential,
	}
	for value, constant := range expected {
		if constant != value {
			t.Errorf("constant for %q is %q — mismatch", value, constant)
		}
	}
}

func TestAllSharePermissionsHaveConstants(t *testing.T) {
	expected := map[string]string{
		"view":     PermissionView,
		"download": PermissionDownload,
		"edit":     PermissionEdit,
		"share":    PermissionShare,
		"approve":  PermissionApprove,
	}
	for value, constant := range expected {
		if constant != value {
			t.Errorf("constant for %q is %q — mismatch", value, constant)
		}
	}
}

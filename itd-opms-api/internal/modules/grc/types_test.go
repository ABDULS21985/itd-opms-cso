package grc

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Risk status constants
// ──────────────────────────────────────────────

func TestRiskStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Identified", RiskStatusIdentified, "identified"},
		{"Assessed", RiskStatusAssessed, "assessed"},
		{"Mitigating", RiskStatusMitigating, "mitigating"},
		{"Accepted", RiskStatusAccepted, "accepted"},
		{"Closed", RiskStatusClosed, "closed"},
		{"Escalated", RiskStatusEscalated, "escalated"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Risk likelihood constants
// ──────────────────────────────────────────────

func TestLikelihoodConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"VeryLow", LikelihoodVeryLow, "very_low"},
		{"Low", LikelihoodLow, "low"},
		{"Medium", LikelihoodMedium, "medium"},
		{"High", LikelihoodHigh, "high"},
		{"VeryHigh", LikelihoodVeryHigh, "very_high"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Impact constants
// ──────────────────────────────────────────────

func TestImpactConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"VeryLow", ImpactVeryLow, "very_low"},
		{"Low", ImpactLow, "low"},
		{"Medium", ImpactMedium, "medium"},
		{"High", ImpactHigh, "high"},
		{"VeryHigh", ImpactVeryHigh, "very_high"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Risk category constants
// ──────────────────────────────────────────────

func TestRiskCategoryConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Operational", RiskCategoryOperational, "operational"},
		{"Strategic", RiskCategoryStrategic, "strategic"},
		{"Financial", RiskCategoryFinancial, "financial"},
		{"Compliance", RiskCategoryCompliance, "compliance"},
		{"Technology", RiskCategoryTechnology, "technology"},
		{"Security", RiskCategorySecurity, "security"},
		{"Reputation", RiskCategoryReputation, "reputation"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Audit type constants
// ──────────────────────────────────────────────

func TestAuditTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Internal", AuditTypeInternal, "internal"},
		{"External", AuditTypeExternal, "external"},
		{"Regulatory", AuditTypeRegulatory, "regulatory"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Audit status constants
// ──────────────────────────────────────────────

func TestAuditStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Planned", AuditStatusPlanned, "planned"},
		{"Preparing", AuditStatusPreparing, "preparing"},
		{"InProgress", AuditStatusInProgress, "in_progress"},
		{"FindingsReview", AuditStatusFindingsReview, "findings_review"},
		{"Completed", AuditStatusCompleted, "completed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Finding severity & status constants
// ──────────────────────────────────────────────

func TestFindingSeverityConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Low", FindingSeverityLow, "low"},
		{"Medium", FindingSeverityMedium, "medium"},
		{"High", FindingSeverityHigh, "high"},
		{"Critical", FindingSeverityCritical, "critical"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

func TestFindingStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Open", FindingStatusOpen, "open"},
		{"RemediationPlanned", FindingStatusRemediationPlanned, "remediation_planned"},
		{"InRemediation", FindingStatusInRemediation, "in_remediation"},
		{"Closed", FindingStatusClosed, "closed"},
		{"Accepted", FindingStatusAccepted, "accepted"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Evidence status constants
// ──────────────────────────────────────────────

func TestEvidenceStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Pending", EvidenceStatusPending, "pending"},
		{"Collecting", EvidenceStatusCollecting, "collecting"},
		{"Review", EvidenceStatusReview, "review"},
		{"Approved", EvidenceStatusApproved, "approved"},
		{"Submitted", EvidenceStatusSubmitted, "submitted"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Access review status constants
// ──────────────────────────────────────────────

func TestAccessReviewStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Planned", AccessReviewStatusPlanned, "planned"},
		{"Active", AccessReviewStatusActive, "active"},
		{"Review", AccessReviewStatusReview, "review"},
		{"Completed", AccessReviewStatusCompleted, "completed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Review decision constants
// ──────────────────────────────────────────────

func TestReviewDecisionConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"Approved", ReviewDecisionApproved, "approved"},
		{"Revoked", ReviewDecisionRevoked, "revoked"},
		{"Exception", ReviewDecisionException, "exception"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Compliance status constants
// ──────────────────────────────────────────────

func TestComplianceStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"NotStarted", ComplianceStatusNotStarted, "not_started"},
		{"Partial", ComplianceStatusPartial, "partial"},
		{"Implemented", ComplianceStatusImplemented, "implemented"},
		{"Verified", ComplianceStatusVerified, "verified"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Framework constants
// ──────────────────────────────────────────────

func TestFrameworkConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant string
		expected string
	}{
		{"ISO27001", FrameworkISO27001, "ISO_27001"},
		{"NIST", FrameworkNIST, "NIST_CSF"},
		{"COBIT", FrameworkCOBIT, "COBIT"},
		{"PCIDSS", FrameworkPCIDSS, "PCI_DSS"},
		{"SOC2", FrameworkSOC2, "SOC2"},
		{"NDPR", FrameworkNDPR, "NDPR"},
		{"CBNGuidelines", FrameworkCBNGuidelines, "CBN_IT_GUIDELINES"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.constant)
			}
		})
	}
}

// ──────────────────────────────────────────────
// likelihoodImpactScore helper
// ──────────────────────────────────────────────

func TestLikelihoodImpactScore(t *testing.T) {
	tests := []struct {
		name       string
		likelihood string
		impact     string
		expected   int
	}{
		{"VeryLow_VeryLow", "very_low", "very_low", 1},
		{"Low_Low", "low", "low", 4},
		{"Medium_Medium", "medium", "medium", 9},
		{"High_High", "high", "high", 16},
		{"VeryHigh_VeryHigh", "very_high", "very_high", 25},
		{"VeryLow_VeryHigh", "very_low", "very_high", 5},
		{"VeryHigh_VeryLow", "very_high", "very_low", 5},
		{"Low_High", "low", "high", 8},
		{"High_Low", "high", "low", 8},
		{"Medium_VeryHigh", "medium", "very_high", 15},
		{"InvalidLikelihood", "unknown", "low", 0},
		{"InvalidImpact", "low", "unknown", 0},
		{"BothInvalid", "foo", "bar", 0},
		{"EmptyStrings", "", "", 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := likelihoodImpactScore(tt.likelihood, tt.impact)
			if got != tt.expected {
				t.Errorf("likelihoodImpactScore(%q, %q) = %d, want %d",
					tt.likelihood, tt.impact, got, tt.expected)
			}
		})
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: Risk
// ──────────────────────────────────────────────

func TestRisk_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Test risk description"
	ownerID := uuid.New()

	original := Risk{
		ID:                  uuid.New(),
		TenantID:            uuid.New(),
		RiskNumber:          "RSK-0001",
		Title:               "Data Breach Risk",
		Description:         &desc,
		Category:            RiskCategoryTechnology,
		Likelihood:          LikelihoodHigh,
		Impact:              ImpactVeryHigh,
		RiskScore:           20,
		Status:              RiskStatusIdentified,
		OwnerID:             &ownerID,
		EscalationThreshold: 15,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Risk: %v", err)
	}

	var decoded Risk
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Risk: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID: expected %s, got %s", original.TenantID, decoded.TenantID)
	}
	if decoded.RiskNumber != original.RiskNumber {
		t.Errorf("RiskNumber: expected %s, got %s", original.RiskNumber, decoded.RiskNumber)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title: expected %s, got %s", original.Title, decoded.Title)
	}
	if decoded.Description == nil || *decoded.Description != *original.Description {
		t.Errorf("Description: expected %v, got %v", original.Description, decoded.Description)
	}
	if decoded.Category != original.Category {
		t.Errorf("Category: expected %s, got %s", original.Category, decoded.Category)
	}
	if decoded.Likelihood != original.Likelihood {
		t.Errorf("Likelihood: expected %s, got %s", original.Likelihood, decoded.Likelihood)
	}
	if decoded.Impact != original.Impact {
		t.Errorf("Impact: expected %s, got %s", original.Impact, decoded.Impact)
	}
	if decoded.RiskScore != original.RiskScore {
		t.Errorf("RiskScore: expected %d, got %d", original.RiskScore, decoded.RiskScore)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status: expected %s, got %s", original.Status, decoded.Status)
	}
	if decoded.OwnerID == nil || *decoded.OwnerID != *original.OwnerID {
		t.Errorf("OwnerID: expected %v, got %v", original.OwnerID, decoded.OwnerID)
	}
	if decoded.EscalationThreshold != original.EscalationThreshold {
		t.Errorf("EscalationThreshold: expected %d, got %d", original.EscalationThreshold, decoded.EscalationThreshold)
	}
}

func TestRisk_JSONFieldNames(t *testing.T) {
	risk := Risk{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		RiskNumber: "RSK-0001",
		Title:      "Test",
		Category:   "operational",
		Likelihood: "low",
		Impact:     "low",
		Status:     "identified",
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	data, err := json.Marshal(risk)
	if err != nil {
		t.Fatalf("failed to marshal Risk: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal into map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "riskNumber", "title", "description",
		"category", "likelihood", "impact", "riskScore", "status",
		"treatmentPlan", "contingencyPlan", "ownerId", "reviewerId",
		"reviewDate", "nextReviewDate", "linkedProjectId", "linkedAuditId",
		"escalationThreshold", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized Risk", field)
		}
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: Audit
// ──────────────────────────────────────────────

func TestAudit_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	scope := "Full system audit"

	original := Audit{
		ID:                   uuid.New(),
		TenantID:             uuid.New(),
		Title:                "Q1 Security Audit",
		AuditType:            AuditTypeInternal,
		Scope:                &scope,
		Status:               AuditStatusPlanned,
		EvidenceRequirements: json.RawMessage(`{"items": ["firewall_logs", "access_controls"]}`),
		ReadinessScore:       75.5,
		CreatedBy:            uuid.New(),
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Audit: %v", err)
	}

	var decoded Audit
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Audit: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title: expected %s, got %s", original.Title, decoded.Title)
	}
	if decoded.AuditType != original.AuditType {
		t.Errorf("AuditType: expected %s, got %s", original.AuditType, decoded.AuditType)
	}
	if decoded.Scope == nil || *decoded.Scope != *original.Scope {
		t.Errorf("Scope: expected %v, got %v", original.Scope, decoded.Scope)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status: expected %s, got %s", original.Status, decoded.Status)
	}
	if decoded.ReadinessScore != original.ReadinessScore {
		t.Errorf("ReadinessScore: expected %f, got %f", original.ReadinessScore, decoded.ReadinessScore)
	}
	if decoded.CreatedBy != original.CreatedBy {
		t.Errorf("CreatedBy: expected %s, got %s", original.CreatedBy, decoded.CreatedBy)
	}
}

func TestAudit_JSONFieldNames(t *testing.T) {
	a := Audit{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Title:     "Test",
		AuditType: "internal",
		Status:    "planned",
		CreatedBy: uuid.New(),
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(a)
	if err != nil {
		t.Fatalf("failed to marshal Audit: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal into map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "title", "auditType", "scope",
		"auditor", "auditBody", "status", "scheduledStart",
		"scheduledEnd", "evidenceRequirements", "readinessScore",
		"createdBy", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized Audit", field)
		}
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: AccessReviewCampaign
// ──────────────────────────────────────────────

func TestAccessReviewCampaign_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	scope := "All admin users"
	reviewer1 := uuid.New()
	reviewer2 := uuid.New()

	original := AccessReviewCampaign{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		Title:          "Q1 Access Review",
		Scope:          &scope,
		Status:         AccessReviewStatusActive,
		ReviewerIDs:    []uuid.UUID{reviewer1, reviewer2},
		DueDate:        &now,
		CompletionRate: 45.5,
		CreatedBy:      uuid.New(),
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AccessReviewCampaign: %v", err)
	}

	var decoded AccessReviewCampaign
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AccessReviewCampaign: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title: expected %s, got %s", original.Title, decoded.Title)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status: expected %s, got %s", original.Status, decoded.Status)
	}
	if len(decoded.ReviewerIDs) != 2 {
		t.Errorf("ReviewerIDs: expected 2 entries, got %d", len(decoded.ReviewerIDs))
	}
	if decoded.CompletionRate != original.CompletionRate {
		t.Errorf("CompletionRate: expected %f, got %f", original.CompletionRate, decoded.CompletionRate)
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: AccessReviewEntry
// ──────────────────────────────────────────────

func TestAccessReviewEntry_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	decision := ReviewDecisionApproved
	justification := "User still needs access"
	roleID := uuid.New()
	reviewerID := uuid.New()

	original := AccessReviewEntry{
		ID:            uuid.New(),
		CampaignID:    uuid.New(),
		TenantID:      uuid.New(),
		UserID:        uuid.New(),
		RoleID:        &roleID,
		ReviewerID:    &reviewerID,
		Decision:      &decision,
		Justification: &justification,
		DecidedAt:     &now,
		CreatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AccessReviewEntry: %v", err)
	}

	var decoded AccessReviewEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AccessReviewEntry: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.CampaignID != original.CampaignID {
		t.Errorf("CampaignID: expected %s, got %s", original.CampaignID, decoded.CampaignID)
	}
	if decoded.UserID != original.UserID {
		t.Errorf("UserID: expected %s, got %s", original.UserID, decoded.UserID)
	}
	if decoded.Decision == nil || *decoded.Decision != *original.Decision {
		t.Errorf("Decision: expected %v, got %v", original.Decision, decoded.Decision)
	}
	if decoded.Justification == nil || *decoded.Justification != *original.Justification {
		t.Errorf("Justification: expected %v, got %v", original.Justification, decoded.Justification)
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: ComplianceControl
// ──────────────────────────────────────────────

func TestComplianceControl_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Encryption at rest"
	ownerID := uuid.New()
	ref1 := uuid.New()
	ref2 := uuid.New()

	original := ComplianceControl{
		ID:                   uuid.New(),
		TenantID:             uuid.New(),
		Framework:            FrameworkISO27001,
		ControlID:            "A.10.1.1",
		ControlName:          "Cryptographic Controls",
		Description:          &desc,
		ImplementationStatus: ComplianceStatusImplemented,
		EvidenceRefs:         []uuid.UUID{ref1, ref2},
		OwnerID:              &ownerID,
		LastAssessedAt:       &now,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ComplianceControl: %v", err)
	}

	var decoded ComplianceControl
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ComplianceControl: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Framework != original.Framework {
		t.Errorf("Framework: expected %s, got %s", original.Framework, decoded.Framework)
	}
	if decoded.ControlID != original.ControlID {
		t.Errorf("ControlID: expected %s, got %s", original.ControlID, decoded.ControlID)
	}
	if decoded.ControlName != original.ControlName {
		t.Errorf("ControlName: expected %s, got %s", original.ControlName, decoded.ControlName)
	}
	if decoded.ImplementationStatus != original.ImplementationStatus {
		t.Errorf("ImplementationStatus: expected %s, got %s", original.ImplementationStatus, decoded.ImplementationStatus)
	}
	if len(decoded.EvidenceRefs) != 2 {
		t.Errorf("EvidenceRefs: expected 2 entries, got %d", len(decoded.EvidenceRefs))
	}
	if decoded.OwnerID == nil || *decoded.OwnerID != *original.OwnerID {
		t.Errorf("OwnerID: expected %v, got %v", original.OwnerID, decoded.OwnerID)
	}
}

func TestComplianceControl_JSONFieldNames(t *testing.T) {
	c := ComplianceControl{
		ID:                   uuid.New(),
		TenantID:             uuid.New(),
		Framework:            "ISO_27001",
		ControlID:            "A.1",
		ControlName:          "Test",
		ImplementationStatus: "not_started",
		CreatedAt:            time.Now().UTC(),
		UpdatedAt:            time.Now().UTC(),
	}

	data, err := json.Marshal(c)
	if err != nil {
		t.Fatalf("failed to marshal ComplianceControl: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal into map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "framework", "controlId", "controlName",
		"description", "implementationStatus", "evidenceRefs",
		"ownerId", "lastAssessedAt", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized ComplianceControl", field)
		}
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: AuditFinding
// ──────────────────────────────────────────────

func TestAuditFinding_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Missing MFA for admin accounts"
	remediation := "Enable MFA for all admin users"
	ownerID := uuid.New()
	evidenceRef := uuid.New()

	original := AuditFinding{
		ID:                    uuid.New(),
		AuditID:               uuid.New(),
		TenantID:              uuid.New(),
		FindingNumber:         "FND-0001",
		Title:                 "Missing MFA",
		Description:           &desc,
		Severity:              FindingSeverityCritical,
		Status:                FindingStatusOpen,
		RemediationPlan:       &remediation,
		OwnerID:               &ownerID,
		DueDate:               &now,
		EvidenceOfRemediation: []uuid.UUID{evidenceRef},
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AuditFinding: %v", err)
	}

	var decoded AuditFinding
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AuditFinding: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.AuditID != original.AuditID {
		t.Errorf("AuditID: expected %s, got %s", original.AuditID, decoded.AuditID)
	}
	if decoded.FindingNumber != original.FindingNumber {
		t.Errorf("FindingNumber: expected %s, got %s", original.FindingNumber, decoded.FindingNumber)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title: expected %s, got %s", original.Title, decoded.Title)
	}
	if decoded.Severity != original.Severity {
		t.Errorf("Severity: expected %s, got %s", original.Severity, decoded.Severity)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status: expected %s, got %s", original.Status, decoded.Status)
	}
	if len(decoded.EvidenceOfRemediation) != 1 {
		t.Errorf("EvidenceOfRemediation: expected 1 entry, got %d", len(decoded.EvidenceOfRemediation))
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: EvidenceCollection
// ──────────────────────────────────────────────

func TestEvidenceCollection_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Firewall configuration evidence"
	collectorID := uuid.New()
	checksum := "sha256:abc123"
	item1 := uuid.New()
	item2 := uuid.New()

	original := EvidenceCollection{
		ID:              uuid.New(),
		AuditID:         uuid.New(),
		TenantID:        uuid.New(),
		Title:           "Firewall Evidence",
		Description:     &desc,
		Status:          EvidenceStatusApproved,
		EvidenceItemIDs: []uuid.UUID{item1, item2},
		CollectorID:     &collectorID,
		Checksum:        &checksum,
		ApprovedAt:      &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal EvidenceCollection: %v", err)
	}

	var decoded EvidenceCollection
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal EvidenceCollection: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title: expected %s, got %s", original.Title, decoded.Title)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status: expected %s, got %s", original.Status, decoded.Status)
	}
	if len(decoded.EvidenceItemIDs) != 2 {
		t.Errorf("EvidenceItemIDs: expected 2 entries, got %d", len(decoded.EvidenceItemIDs))
	}
	if decoded.Checksum == nil || *decoded.Checksum != *original.Checksum {
		t.Errorf("Checksum: expected %v, got %v", original.Checksum, decoded.Checksum)
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: RiskAssessment
// ──────────────────────────────────────────────

func TestRiskAssessment_JSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	prevLikelihood := LikelihoodLow
	prevImpact := ImpactMedium
	rationale := "Re-assessed after mitigation"
	ref1 := uuid.New()

	original := RiskAssessment{
		ID:                 uuid.New(),
		RiskID:             uuid.New(),
		AssessedBy:         uuid.New(),
		AssessmentDate:     now,
		PreviousLikelihood: &prevLikelihood,
		PreviousImpact:     &prevImpact,
		NewLikelihood:      LikelihoodVeryLow,
		NewImpact:          ImpactLow,
		Rationale:          &rationale,
		EvidenceRefs:       []uuid.UUID{ref1},
		CreatedAt:          now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RiskAssessment: %v", err)
	}

	var decoded RiskAssessment
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RiskAssessment: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.RiskID != original.RiskID {
		t.Errorf("RiskID: expected %s, got %s", original.RiskID, decoded.RiskID)
	}
	if decoded.NewLikelihood != original.NewLikelihood {
		t.Errorf("NewLikelihood: expected %s, got %s", original.NewLikelihood, decoded.NewLikelihood)
	}
	if decoded.NewImpact != original.NewImpact {
		t.Errorf("NewImpact: expected %s, got %s", original.NewImpact, decoded.NewImpact)
	}
	if decoded.PreviousLikelihood == nil || *decoded.PreviousLikelihood != *original.PreviousLikelihood {
		t.Errorf("PreviousLikelihood: expected %v, got %v", original.PreviousLikelihood, decoded.PreviousLikelihood)
	}
	if decoded.Rationale == nil || *decoded.Rationale != *original.Rationale {
		t.Errorf("Rationale: expected %v, got %v", original.Rationale, decoded.Rationale)
	}
	if len(decoded.EvidenceRefs) != 1 {
		t.Errorf("EvidenceRefs: expected 1 entry, got %d", len(decoded.EvidenceRefs))
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: RiskHeatMapEntry
// ──────────────────────────────────────────────

func TestRiskHeatMapEntry_JSONRoundTrip(t *testing.T) {
	original := RiskHeatMapEntry{
		Likelihood: LikelihoodHigh,
		Impact:     ImpactMedium,
		Count:      7,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RiskHeatMapEntry: %v", err)
	}

	var decoded RiskHeatMapEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RiskHeatMapEntry: %v", err)
	}

	if decoded.Likelihood != original.Likelihood {
		t.Errorf("Likelihood: expected %s, got %s", original.Likelihood, decoded.Likelihood)
	}
	if decoded.Impact != original.Impact {
		t.Errorf("Impact: expected %s, got %s", original.Impact, decoded.Impact)
	}
	if decoded.Count != original.Count {
		t.Errorf("Count: expected %d, got %d", original.Count, decoded.Count)
	}
}

// ──────────────────────────────────────────────
// JSON round-trip: ComplianceStats
// ──────────────────────────────────────────────

func TestComplianceStats_JSONRoundTrip(t *testing.T) {
	original := ComplianceStats{
		Framework:      FrameworkNIST,
		Total:          50,
		CompliantCount: 42,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ComplianceStats: %v", err)
	}

	var decoded ComplianceStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ComplianceStats: %v", err)
	}

	if decoded.Framework != original.Framework {
		t.Errorf("Framework: expected %s, got %s", original.Framework, decoded.Framework)
	}
	if decoded.Total != original.Total {
		t.Errorf("Total: expected %d, got %d", original.Total, decoded.Total)
	}
	if decoded.CompliantCount != original.CompliantCount {
		t.Errorf("CompliantCount: expected %d, got %d", original.CompliantCount, decoded.CompliantCount)
	}
}

// ──────────────────────────────────────────────
// Risk JSON with null optional fields
// ──────────────────────────────────────────────

func TestRisk_JSONNullOptionalFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	risk := Risk{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		RiskNumber: "RSK-0001",
		Title:      "Test",
		Category:   RiskCategoryOperational,
		Likelihood: LikelihoodLow,
		Impact:     ImpactLow,
		RiskScore:  4,
		Status:     RiskStatusIdentified,
		CreatedAt:  now,
		UpdatedAt:  now,
		// All pointer fields left nil
	}

	data, err := json.Marshal(risk)
	if err != nil {
		t.Fatalf("failed to marshal Risk with nil optional fields: %v", err)
	}

	var decoded Risk
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Risk with nil optional fields: %v", err)
	}

	if decoded.Description != nil {
		t.Errorf("Description: expected nil, got %v", decoded.Description)
	}
	if decoded.TreatmentPlan != nil {
		t.Errorf("TreatmentPlan: expected nil, got %v", decoded.TreatmentPlan)
	}
	if decoded.ContingencyPlan != nil {
		t.Errorf("ContingencyPlan: expected nil, got %v", decoded.ContingencyPlan)
	}
	if decoded.OwnerID != nil {
		t.Errorf("OwnerID: expected nil, got %v", decoded.OwnerID)
	}
	if decoded.ReviewerID != nil {
		t.Errorf("ReviewerID: expected nil, got %v", decoded.ReviewerID)
	}
	if decoded.ReviewDate != nil {
		t.Errorf("ReviewDate: expected nil, got %v", decoded.ReviewDate)
	}
	if decoded.NextReviewDate != nil {
		t.Errorf("NextReviewDate: expected nil, got %v", decoded.NextReviewDate)
	}
	if decoded.LinkedProjectID != nil {
		t.Errorf("LinkedProjectID: expected nil, got %v", decoded.LinkedProjectID)
	}
	if decoded.LinkedAuditID != nil {
		t.Errorf("LinkedAuditID: expected nil, got %v", decoded.LinkedAuditID)
	}
}

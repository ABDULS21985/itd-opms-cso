package approval

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Step mode constants
// ──────────────────────────────────────────────

func TestStepModeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      StepMode
		expected StepMode
	}{
		{"Sequential", StepModeSequential, "sequential"},
		{"Parallel", StepModeParallel, "parallel"},
		{"AnyOf", StepModeAnyOf, "any_of"},
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
// Chain status constants
// ──────────────────────────────────────────────

func TestChainStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Pending", ChainStatusPending, "pending"},
		{"InProgress", ChainStatusInProgress, "in_progress"},
		{"Approved", ChainStatusApproved, "approved"},
		{"Rejected", ChainStatusRejected, "rejected"},
		{"Cancelled", ChainStatusCancelled, "cancelled"},
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
// Decision constants
// ──────────────────────────────────────────────

func TestDecisionConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Pending", DecisionPending, "pending"},
		{"Approved", DecisionApproved, "approved"},
		{"Rejected", DecisionRejected, "rejected"},
		{"Skipped", DecisionSkipped, "skipped"},
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
// Urgency constants
// ──────────────────────────────────────────────

func TestUrgencyConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Low", UrgencyLow, "low"},
		{"Normal", UrgencyNormal, "normal"},
		{"High", UrgencyHigh, "high"},
		{"Critical", UrgencyCritical, "critical"},
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
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestWorkflowDefinitionJSONRoundTrip(t *testing.T) {
	desc := "Standard change approval"
	now := time.Now().UTC().Truncate(time.Second)
	original := WorkflowDefinition{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		Name:        "Change Approval Workflow",
		Description: &desc,
		EntityType:  "change_request",
		Steps: []WorkflowStepDef{
			{
				StepOrder:       1,
				Name:            "Manager Approval",
				Mode:            StepModeSequential,
				Quorum:          1,
				ApproverType:    "role",
				ApproverIDs:     []string{"manager"},
				TimeoutHours:    48,
				AllowDelegation: true,
			},
			{
				StepOrder:       2,
				Name:            "Director Approval",
				Mode:            StepModeParallel,
				Quorum:          2,
				ApproverType:    "user",
				ApproverIDs:     []string{uuid.New().String(), uuid.New().String()},
				TimeoutHours:    72,
				AllowDelegation: false,
			},
		},
		IsActive:  true,
		Version:   1,
		CreatedBy: uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal WorkflowDefinition: %v", err)
	}

	var decoded WorkflowDefinition
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal WorkflowDefinition: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch")
	}
	if decoded.EntityType != "change_request" {
		t.Errorf("EntityType mismatch")
	}
	if len(decoded.Steps) != 2 {
		t.Fatalf("Steps count mismatch: expected 2, got %d", len(decoded.Steps))
	}
	if decoded.Steps[0].Name != "Manager Approval" {
		t.Errorf("Steps[0].Name mismatch")
	}
	if decoded.Steps[0].Mode != StepModeSequential {
		t.Errorf("Steps[0].Mode mismatch")
	}
	if decoded.Steps[0].TimeoutHours != 48 {
		t.Errorf("Steps[0].TimeoutHours mismatch")
	}
	if !decoded.Steps[0].AllowDelegation {
		t.Errorf("Steps[0].AllowDelegation mismatch")
	}
	if decoded.Steps[1].Mode != StepModeParallel {
		t.Errorf("Steps[1].Mode mismatch")
	}
	if decoded.Steps[1].Quorum != 2 {
		t.Errorf("Steps[1].Quorum mismatch")
	}
	if !decoded.IsActive {
		t.Errorf("IsActive mismatch")
	}
	if decoded.Version != 1 {
		t.Errorf("Version mismatch: expected 1, got %d", decoded.Version)
	}
}

func TestApprovalChainJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	deadline := now.Add(72 * time.Hour)
	original := ApprovalChain{
		ID:                   uuid.New(),
		EntityType:           "change_request",
		EntityID:             uuid.New(),
		TenantID:             uuid.New(),
		WorkflowDefinitionID: uuid.New(),
		Status:               ChainStatusInProgress,
		CurrentStep:          1,
		Deadline:             &deadline,
		Urgency:              UrgencyHigh,
		Metadata:             json.RawMessage(`{"priority":"high"}`),
		CreatedBy:            uuid.New(),
		CreatedAt:            now,
		Steps: []ApprovalStep{
			{
				ID:           uuid.New(),
				ChainID:      uuid.New(),
				StepOrder:    1,
				ApproverID:   uuid.New(),
				ApproverName: "John Manager",
				Decision:     DecisionPending,
				CreatedAt:    now,
			},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ApprovalChain: %v", err)
	}

	var decoded ApprovalChain
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ApprovalChain: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Status != ChainStatusInProgress {
		t.Errorf("Status mismatch: expected %q, got %q", ChainStatusInProgress, decoded.Status)
	}
	if decoded.CurrentStep != 1 {
		t.Errorf("CurrentStep mismatch: expected 1, got %d", decoded.CurrentStep)
	}
	if decoded.Urgency != UrgencyHigh {
		t.Errorf("Urgency mismatch")
	}
	if decoded.Deadline == nil {
		t.Errorf("Deadline should not be nil")
	}
	if len(decoded.Steps) != 1 {
		t.Fatalf("Steps count mismatch: expected 1, got %d", len(decoded.Steps))
	}
	if decoded.Steps[0].ApproverName != "John Manager" {
		t.Errorf("Steps[0].ApproverName mismatch")
	}
	if decoded.Steps[0].Decision != DecisionPending {
		t.Errorf("Steps[0].Decision mismatch")
	}
}

func TestApprovalStepJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	comments := "Looks good"
	decidedAt := now
	delegatedFrom := uuid.New()
	original := ApprovalStep{
		ID:            uuid.New(),
		ChainID:       uuid.New(),
		StepOrder:     2,
		ApproverID:    uuid.New(),
		ApproverName:  "Jane Director",
		Decision:      DecisionApproved,
		Comments:      &comments,
		DecidedAt:     &decidedAt,
		EvidenceRefs:  []string{"doc-1", "doc-2"},
		DelegatedFrom: &delegatedFrom,
		CreatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ApprovalStep: %v", err)
	}

	var decoded ApprovalStep
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ApprovalStep: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.StepOrder != 2 {
		t.Errorf("StepOrder mismatch")
	}
	if decoded.Decision != DecisionApproved {
		t.Errorf("Decision mismatch")
	}
	if decoded.Comments == nil || *decoded.Comments != comments {
		t.Errorf("Comments mismatch")
	}
	if len(decoded.EvidenceRefs) != 2 {
		t.Errorf("EvidenceRefs mismatch: expected 2, got %d", len(decoded.EvidenceRefs))
	}
	if decoded.DelegatedFrom == nil || *decoded.DelegatedFrom != delegatedFrom {
		t.Errorf("DelegatedFrom mismatch")
	}
}

func TestApprovalDelegationJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	reason := "On vacation"
	original := ApprovalDelegation{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		DelegatedBy: uuid.New(),
		DelegatedTo: uuid.New(),
		StepID:      uuid.New(),
		Reason:      &reason,
		CreatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ApprovalDelegation: %v", err)
	}

	var decoded ApprovalDelegation
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ApprovalDelegation: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.DelegatedBy != original.DelegatedBy {
		t.Errorf("DelegatedBy mismatch")
	}
	if decoded.DelegatedTo != original.DelegatedTo {
		t.Errorf("DelegatedTo mismatch")
	}
	if decoded.Reason == nil || *decoded.Reason != reason {
		t.Errorf("Reason mismatch")
	}
}

func TestPendingApprovalItemJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	deadline := now.Add(24 * time.Hour)
	original := PendingApprovalItem{
		StepID:      uuid.New(),
		ChainID:     uuid.New(),
		EntityType:  "change_request",
		EntityID:    uuid.New(),
		StepOrder:   1,
		StepName:    "Manager Review",
		Urgency:     UrgencyHigh,
		Deadline:    &deadline,
		RequestedBy: "admin@test.com",
		RequestedAt: now,
		ChainStatus: ChainStatusInProgress,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal PendingApprovalItem: %v", err)
	}

	var decoded PendingApprovalItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PendingApprovalItem: %v", err)
	}

	if decoded.StepID != original.StepID {
		t.Errorf("StepID mismatch")
	}
	if decoded.StepName != "Manager Review" {
		t.Errorf("StepName mismatch")
	}
	if decoded.Urgency != UrgencyHigh {
		t.Errorf("Urgency mismatch")
	}
	if decoded.ChainStatus != ChainStatusInProgress {
		t.Errorf("ChainStatus mismatch")
	}
}

func TestApprovalHistoryItemJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	completedAt := now
	original := ApprovalHistoryItem{
		ChainID:     uuid.New(),
		EntityType:  "change_request",
		EntityID:    uuid.New(),
		Status:      ChainStatusApproved,
		CurrentStep: 3,
		TotalSteps:  3,
		Urgency:     UrgencyNormal,
		CreatedBy:   "admin@test.com",
		CreatedAt:   now,
		CompletedAt: &completedAt,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ApprovalHistoryItem: %v", err)
	}

	var decoded ApprovalHistoryItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ApprovalHistoryItem: %v", err)
	}

	if decoded.ChainID != original.ChainID {
		t.Errorf("ChainID mismatch")
	}
	if decoded.Status != ChainStatusApproved {
		t.Errorf("Status mismatch")
	}
	if decoded.TotalSteps != 3 {
		t.Errorf("TotalSteps mismatch: expected 3, got %d", decoded.TotalSteps)
	}
	if decoded.CompletedAt == nil {
		t.Errorf("CompletedAt should not be nil")
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateWorkflowDefinitionRequestJSON(t *testing.T) {
	body := `{
		"name": "Simple Approval",
		"entityType": "ticket",
		"steps": [
			{
				"stepOrder": 1,
				"name": "Admin Review",
				"mode": "sequential",
				"quorum": 1,
				"approverType": "role",
				"approverIds": ["admin"],
				"timeoutHours": 24,
				"allowDelegation": true
			}
		]
	}`

	var req CreateWorkflowDefinitionRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateWorkflowDefinitionRequest: %v", err)
	}

	if req.Name != "Simple Approval" {
		t.Errorf("Name mismatch")
	}
	if req.EntityType != "ticket" {
		t.Errorf("EntityType mismatch")
	}
	if len(req.Steps) != 1 {
		t.Fatalf("Steps count mismatch")
	}
	if req.Steps[0].Name != "Admin Review" {
		t.Errorf("Steps[0].Name mismatch")
	}
	if req.Steps[0].Mode != StepModeSequential {
		t.Errorf("Steps[0].Mode mismatch")
	}
}

func TestStartApprovalRequestJSON(t *testing.T) {
	body := `{
		"entityType": "change_request",
		"entityId": "11111111-1111-1111-1111-111111111111",
		"urgency": "high",
		"metadata": {"priority": "critical"}
	}`

	var req StartApprovalRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal StartApprovalRequest: %v", err)
	}

	if req.EntityType != "change_request" {
		t.Errorf("EntityType mismatch")
	}
	if req.EntityID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("EntityID mismatch")
	}
	if req.Urgency != "high" {
		t.Errorf("Urgency mismatch")
	}
}

func TestApprovalDecisionRequestJSON(t *testing.T) {
	body := `{
		"decision": "approved",
		"comments": "All checks passed",
		"evidenceRefs": ["doc-123", "doc-456"]
	}`

	var req ApprovalDecisionRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal ApprovalDecisionRequest: %v", err)
	}

	if req.Decision != "approved" {
		t.Errorf("Decision mismatch")
	}
	if req.Comments == nil || *req.Comments != "All checks passed" {
		t.Errorf("Comments mismatch")
	}
	if len(req.EvidenceRefs) != 2 {
		t.Errorf("EvidenceRefs mismatch")
	}
}

func TestDelegateApprovalRequestJSON(t *testing.T) {
	body := `{
		"toUserId": "33333333-3333-3333-3333-333333333333",
		"reason": "On vacation"
	}`

	var req DelegateApprovalRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal DelegateApprovalRequest: %v", err)
	}

	if req.ToUserID.String() != "33333333-3333-3333-3333-333333333333" {
		t.Errorf("ToUserID mismatch")
	}
	if req.Reason == nil || *req.Reason != "On vacation" {
		t.Errorf("Reason mismatch")
	}
}

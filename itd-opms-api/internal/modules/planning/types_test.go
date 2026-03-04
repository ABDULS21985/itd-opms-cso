package planning

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Project status constants
// ──────────────────────────────────────────────

func TestProjectStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Proposed", ProjectStatusProposed, "proposed"},
		{"Approved", ProjectStatusApproved, "approved"},
		{"Active", ProjectStatusActive, "active"},
		{"OnHold", ProjectStatusOnHold, "on_hold"},
		{"Completed", ProjectStatusCompleted, "completed"},
		{"Cancelled", ProjectStatusCancelled, "cancelled"},
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
// RAG status constants
// ──────────────────────────────────────────────

func TestRAGStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Green", RAGGreen, "green"},
		{"Amber", RAGAmber, "amber"},
		{"Red", RAGRed, "red"},
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
// Work item type constants
// ──────────────────────────────────────────────

func TestWorkItemTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Epic", WorkItemTypeEpic, "epic"},
		{"Story", WorkItemTypeStory, "story"},
		{"Task", WorkItemTypeTask, "task"},
		{"Subtask", WorkItemTypeSubtask, "subtask"},
		{"Milestone", WorkItemTypeMilestone, "milestone"},
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
// Work item status constants
// ──────────────────────────────────────────────

func TestWorkItemStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Todo", WorkItemStatusTodo, "todo"},
		{"InProgress", WorkItemStatusInProgress, "in_progress"},
		{"InReview", WorkItemStatusInReview, "in_review"},
		{"Done", WorkItemStatusDone, "done"},
		{"Blocked", WorkItemStatusBlocked, "blocked"},
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
// Priority constants
// ──────────────────────────────────────────────

func TestPriorityConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Critical", PriorityCritical, "critical"},
		{"High", PriorityHigh, "high"},
		{"Medium", PriorityMedium, "medium"},
		{"Low", PriorityLow, "low"},
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
// Risk/issue/CR status constants
// ──────────────────────────────────────────────

func TestRiskStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Identified", RiskStatusIdentified, "identified"},
		{"Assessed", RiskStatusAssessed, "assessed"},
		{"Mitigating", RiskStatusMitigating, "mitigating"},
		{"Accepted", RiskStatusAccepted, "accepted"},
		{"Closed", RiskStatusClosed, "closed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestIssueStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Open", IssueStatusOpen, "open"},
		{"Investigating", IssueStatusInvestigating, "investigating"},
		{"Resolved", IssueStatusResolved, "resolved"},
		{"Closed", IssueStatusClosed, "closed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestCRStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Submitted", CRStatusSubmitted, "submitted"},
		{"UnderReview", CRStatusUnderReview, "under_review"},
		{"Approved", CRStatusApproved, "approved"},
		{"Rejected", CRStatusRejected, "rejected"},
		{"Implemented", CRStatusImplemented, "implemented"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestMilestoneStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Pending", MilestoneStatusPending, "pending"},
		{"Completed", MilestoneStatusCompleted, "completed"},
		{"Missed", MilestoneStatusMissed, "missed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestLevelConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"VeryLow", LevelVeryLow, "very_low"},
		{"Low", LevelLow, "low"},
		{"Medium", LevelMedium, "medium"},
		{"High", LevelHigh, "high"},
		{"VeryHigh", LevelVeryHigh, "very_high"},
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

func TestPortfolioJSONRoundTrip(t *testing.T) {
	desc := "Test portfolio"
	ownerID := uuid.New()
	original := Portfolio{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		Name:        "FY2026 Portfolio",
		Description: &desc,
		OwnerID:     &ownerID,
		FiscalYear:  2026,
		Status:      "active",
		CreatedAt:   time.Now().UTC().Truncate(time.Second),
		UpdatedAt:   time.Now().UTC().Truncate(time.Second),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Portfolio: %v", err)
	}

	var decoded Portfolio
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Portfolio: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.FiscalYear != original.FiscalYear {
		t.Errorf("FiscalYear mismatch: expected %d, got %d", original.FiscalYear, decoded.FiscalYear)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.Description == nil || *decoded.Description != *original.Description {
		t.Errorf("Description mismatch")
	}
	if decoded.OwnerID == nil || *decoded.OwnerID != *original.OwnerID {
		t.Errorf("OwnerID mismatch")
	}
}

func TestProjectJSONRoundTrip(t *testing.T) {
	desc := "Test project"
	now := time.Now().UTC().Truncate(time.Second)
	budget := 100000.0
	original := Project{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		Title:          "OPMS Project",
		Code:           "OPMS-001",
		Description:    &desc,
		Status:         ProjectStatusActive,
		RAGStatus:      RAGGreen,
		Priority:       PriorityHigh,
		BudgetApproved: &budget,
		Metadata:       json.RawMessage(`{"key":"value"}`),
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Project: %v", err)
	}

	var decoded Project
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Project: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: expected %q, got %q", original.Title, decoded.Title)
	}
	if decoded.Code != original.Code {
		t.Errorf("Code mismatch: expected %q, got %q", original.Code, decoded.Code)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.RAGStatus != original.RAGStatus {
		t.Errorf("RAGStatus mismatch: expected %q, got %q", original.RAGStatus, decoded.RAGStatus)
	}
	if decoded.Priority != original.Priority {
		t.Errorf("Priority mismatch: expected %q, got %q", original.Priority, decoded.Priority)
	}
	if decoded.BudgetApproved == nil || *decoded.BudgetApproved != *original.BudgetApproved {
		t.Errorf("BudgetApproved mismatch")
	}
}

func TestWorkItemJSONRoundTrip(t *testing.T) {
	desc := "Implement login"
	hours := 8.0
	now := time.Now().UTC().Truncate(time.Second)
	original := WorkItem{
		ID:             uuid.New(),
		TenantID:       uuid.New(),
		ProjectID:      uuid.New(),
		Type:           WorkItemTypeTask,
		Title:          "Login Feature",
		Description:    &desc,
		Status:         WorkItemStatusTodo,
		Priority:       PriorityMedium,
		EstimatedHours: &hours,
		SortOrder:      1,
		Tags:           []string{"auth", "frontend"},
		Metadata:       json.RawMessage(`{}`),
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal WorkItem: %v", err)
	}

	var decoded WorkItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal WorkItem: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: expected %q, got %q", original.Type, decoded.Type)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: expected %q, got %q", original.Title, decoded.Title)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.SortOrder != original.SortOrder {
		t.Errorf("SortOrder mismatch: expected %d, got %d", original.SortOrder, decoded.SortOrder)
	}
	if len(decoded.Tags) != 2 || decoded.Tags[0] != "auth" || decoded.Tags[1] != "frontend" {
		t.Errorf("Tags mismatch: got %v", decoded.Tags)
	}
}

func TestRiskJSONRoundTrip(t *testing.T) {
	desc := "Data breach risk"
	now := time.Now().UTC().Truncate(time.Second)
	original := Risk{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		Title:      "Data Breach",
		Description: &desc,
		Likelihood: LevelHigh,
		Impact:     LevelVeryHigh,
		RiskScore:  20,
		Status:     RiskStatusIdentified,
		CreatedAt:  now,
		UpdatedAt:  now,
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
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch")
	}
	if decoded.RiskScore != original.RiskScore {
		t.Errorf("RiskScore mismatch: expected %d, got %d", original.RiskScore, decoded.RiskScore)
	}
	if decoded.Likelihood != original.Likelihood {
		t.Errorf("Likelihood mismatch")
	}
	if decoded.Impact != original.Impact {
		t.Errorf("Impact mismatch")
	}
}

func TestIssueJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	original := Issue{
		ID:              uuid.New(),
		TenantID:        uuid.New(),
		Title:           "Server Outage",
		Severity:        PriorityHigh,
		Status:          IssueStatusOpen,
		EscalationLevel: 2,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Issue: %v", err)
	}

	var decoded Issue
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Issue: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.EscalationLevel != 2 {
		t.Errorf("EscalationLevel mismatch: expected 2, got %d", decoded.EscalationLevel)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch")
	}
}

func TestChangeRequestJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	justification := "Needed for compliance"
	original := ChangeRequest{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		Title:         "Add MFA",
		Justification: &justification,
		Status:        CRStatusSubmitted,
		RequestedBy:   uuid.New(),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ChangeRequest: %v", err)
	}

	var decoded ChangeRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ChangeRequest: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.RequestedBy != original.RequestedBy {
		t.Errorf("RequestedBy mismatch")
	}
	if decoded.Justification == nil || *decoded.Justification != justification {
		t.Errorf("Justification mismatch")
	}
}

func TestMilestoneJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "First major delivery"
	ref1 := uuid.New()
	ref2 := uuid.New()
	original := Milestone{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		ProjectID:    uuid.New(),
		Title:        "Phase 1 Complete",
		Description:  &desc,
		TargetDate:   now,
		Status:       MilestoneStatusPending,
		EvidenceRefs: []uuid.UUID{ref1, ref2},
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Milestone: %v", err)
	}

	var decoded Milestone
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Milestone: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch")
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch")
	}
	if len(decoded.EvidenceRefs) != 2 {
		t.Errorf("EvidenceRefs mismatch: expected 2, got %d", len(decoded.EvidenceRefs))
	}
}

func TestTimeEntryJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Worked on login"
	original := TimeEntry{
		ID:          uuid.New(),
		WorkItemID:  uuid.New(),
		UserID:      uuid.New(),
		Hours:       4.5,
		Description: &desc,
		LoggedDate:  now,
		CreatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal TimeEntry: %v", err)
	}

	var decoded TimeEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal TimeEntry: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Hours != 4.5 {
		t.Errorf("Hours mismatch: expected 4.5, got %f", decoded.Hours)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch")
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateWorkItemRequestJSON(t *testing.T) {
	body := `{
		"projectId": "11111111-1111-1111-1111-111111111111",
		"title": "New Feature",
		"type": "story",
		"priority": "high",
		"tags": ["tag1", "tag2"]
	}`

	var req CreateWorkItemRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateWorkItemRequest: %v", err)
	}

	if req.Title != "New Feature" {
		t.Errorf("Title mismatch: expected %q, got %q", "New Feature", req.Title)
	}
	if req.ProjectID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("ProjectID mismatch")
	}
	if req.Type == nil || *req.Type != "story" {
		t.Errorf("Type mismatch")
	}
	if req.Priority == nil || *req.Priority != "high" {
		t.Errorf("Priority mismatch")
	}
	if len(req.Tags) != 2 {
		t.Errorf("Tags mismatch: expected 2, got %d", len(req.Tags))
	}
}

func TestCreatePortfolioRequestJSON(t *testing.T) {
	body := `{"name": "FY2026", "fiscalYear": 2026}`

	var req CreatePortfolioRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreatePortfolioRequest: %v", err)
	}

	if req.Name != "FY2026" {
		t.Errorf("Name mismatch")
	}
	if req.FiscalYear != 2026 {
		t.Errorf("FiscalYear mismatch: expected 2026, got %d", req.FiscalYear)
	}
}

func TestTransitionWorkItemRequestJSON(t *testing.T) {
	body := `{"status": "in_progress"}`

	var req TransitionWorkItemRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal TransitionWorkItemRequest: %v", err)
	}

	if req.Status != "in_progress" {
		t.Errorf("Status mismatch: expected %q, got %q", "in_progress", req.Status)
	}
}

func TestCreateRiskRequestJSON(t *testing.T) {
	body := `{
		"title": "Security Risk",
		"likelihood": "high",
		"impact": "very_high"
	}`

	var req CreateRiskRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateRiskRequest: %v", err)
	}

	if req.Title != "Security Risk" {
		t.Errorf("Title mismatch")
	}
	if req.Likelihood != "high" {
		t.Errorf("Likelihood mismatch")
	}
	if req.Impact != "very_high" {
		t.Errorf("Impact mismatch")
	}
}

func TestValidDocumentCategories(t *testing.T) {
	expectedCategories := []string{
		"project_charter", "project_approval", "business_case",
		"business_requirements", "solution_architecture", "solution_design",
		"solution_brief", "technical_specification", "test_plan",
		"test_results", "user_manual", "training_material",
		"deployment_guide", "meeting_minutes", "status_report",
		"risk_register", "change_request", "sign_off",
		"closure_report", "other",
	}

	for _, cat := range expectedCategories {
		if !ValidDocumentCategories[cat] {
			t.Errorf("expected category %q to be valid", cat)
		}
	}

	// Test an invalid category.
	if ValidDocumentCategories["invalid_category"] {
		t.Errorf("expected 'invalid_category' to be invalid")
	}

	// Verify total count.
	if len(ValidDocumentCategories) != len(expectedCategories) {
		t.Errorf("expected %d categories, got %d", len(expectedCategories), len(ValidDocumentCategories))
	}
}

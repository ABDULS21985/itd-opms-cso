package people

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Proficiency level constants
// ──────────────────────────────────────────────

func TestProficiencyLevelConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Beginner", ProficiencyLevelBeginner, "beginner"},
		{"Intermediate", ProficiencyLevelIntermediate, "intermediate"},
		{"Advanced", ProficiencyLevelAdvanced, "advanced"},
		{"Expert", ProficiencyLevelExpert, "expert"},
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
// Checklist type constants
// ──────────────────────────────────────────────

func TestChecklistTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Onboarding", ChecklistTypeOnboarding, "onboarding"},
		{"Offboarding", ChecklistTypeOffboarding, "offboarding"},
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
// Checklist status constants
// ──────────────────────────────────────────────

func TestChecklistStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Pending", ChecklistStatusPending, "pending"},
		{"InProgress", ChecklistStatusInProgress, "in_progress"},
		{"Completed", ChecklistStatusCompleted, "completed"},
		{"Cancelled", ChecklistStatusCancelled, "cancelled"},
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
// Task status constants
// ──────────────────────────────────────────────

func TestTaskStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Pending", TaskStatusPending, "pending"},
		{"InProgress", TaskStatusInProgress, "in_progress"},
		{"Completed", TaskStatusCompleted, "completed"},
		{"Skipped", TaskStatusSkipped, "skipped"},
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
// Roster status constants
// ──────────────────────────────────────────────

func TestRosterStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Draft", RosterStatusDraft, "draft"},
		{"Published", RosterStatusPublished, "published"},
		{"Archived", RosterStatusArchived, "archived"},
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
// Leave status constants
// ──────────────────────────────────────────────

func TestLeaveStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Pending", LeaveStatusPending, "pending"},
		{"Approved", LeaveStatusApproved, "approved"},
		{"Rejected", LeaveStatusRejected, "rejected"},
		{"Cancelled", LeaveStatusCancelled, "cancelled"},
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
// Training type constants
// ──────────────────────────────────────────────

func TestTrainingTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Course", TrainingTypeCourse, "course"},
		{"Certification", TrainingTypeCertification, "certification"},
		{"Workshop", TrainingTypeWorkshop, "workshop"},
		{"Conference", TrainingTypeConference, "conference"},
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
// Training status constants
// ──────────────────────────────────────────────

func TestTrainingStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Planned", TrainingStatusPlanned, "planned"},
		{"InProgress", TrainingStatusInProgress, "in_progress"},
		{"Completed", TrainingStatusCompleted, "completed"},
		{"Expired", TrainingStatusExpired, "expired"},
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
// JSON round-trip tests — domain types
// ──────────────────────────────────────────────

func TestSkillCategoryJSONRoundTrip(t *testing.T) {
	desc := "Technical skills"
	parentID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	original := SkillCategory{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		Name:        "Programming",
		Description: &desc,
		ParentID:    &parentID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SkillCategory: %v", err)
	}

	var decoded SkillCategory
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SkillCategory: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.Description == nil || *decoded.Description != *original.Description {
		t.Errorf("Description mismatch")
	}
	if decoded.ParentID == nil || *decoded.ParentID != *original.ParentID {
		t.Errorf("ParentID mismatch")
	}
}

func TestSkillJSONRoundTrip(t *testing.T) {
	desc := "Go programming language"
	now := time.Now().UTC().Truncate(time.Second)
	original := Skill{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		CategoryID:  uuid.New(),
		Name:        "Go",
		Description: &desc,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Skill: %v", err)
	}

	var decoded Skill
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Skill: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: expected %s, got %s", original.ID, decoded.ID)
	}
	if decoded.CategoryID != original.CategoryID {
		t.Errorf("CategoryID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.Description == nil || *decoded.Description != *original.Description {
		t.Errorf("Description mismatch")
	}
}

func TestUserSkillJSONRoundTrip(t *testing.T) {
	certName := "AWS Solutions Architect"
	certExpiry := time.Now().UTC().Add(365 * 24 * time.Hour).Truncate(time.Second)
	verifiedBy := uuid.New()
	verifiedAt := time.Now().UTC().Truncate(time.Second)
	now := time.Now().UTC().Truncate(time.Second)
	original := UserSkill{
		ID:                  uuid.New(),
		TenantID:            uuid.New(),
		UserID:              uuid.New(),
		SkillID:             uuid.New(),
		ProficiencyLevel:    ProficiencyLevelAdvanced,
		Certified:           true,
		CertificationName:   &certName,
		CertificationExpiry: &certExpiry,
		VerifiedBy:          &verifiedBy,
		VerifiedAt:          &verifiedAt,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal UserSkill: %v", err)
	}

	var decoded UserSkill
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal UserSkill: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.ProficiencyLevel != original.ProficiencyLevel {
		t.Errorf("ProficiencyLevel mismatch: expected %q, got %q", original.ProficiencyLevel, decoded.ProficiencyLevel)
	}
	if !decoded.Certified {
		t.Errorf("Certified mismatch: expected true, got false")
	}
	if decoded.CertificationName == nil || *decoded.CertificationName != *original.CertificationName {
		t.Errorf("CertificationName mismatch")
	}
	if decoded.VerifiedBy == nil || *decoded.VerifiedBy != *original.VerifiedBy {
		t.Errorf("VerifiedBy mismatch")
	}
}

func TestRoleSkillRequirementJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	original := RoleSkillRequirement{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		RoleType:      "senior_developer",
		SkillID:       uuid.New(),
		RequiredLevel: ProficiencyLevelAdvanced,
		CreatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RoleSkillRequirement: %v", err)
	}

	var decoded RoleSkillRequirement
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RoleSkillRequirement: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.RoleType != original.RoleType {
		t.Errorf("RoleType mismatch: expected %q, got %q", original.RoleType, decoded.RoleType)
	}
	if decoded.RequiredLevel != original.RequiredLevel {
		t.Errorf("RequiredLevel mismatch: expected %q, got %q", original.RequiredLevel, decoded.RequiredLevel)
	}
}

func TestSkillGapEntryJSONRoundTrip(t *testing.T) {
	original := SkillGapEntry{
		SkillName:     "Kubernetes",
		RequiredLevel: ProficiencyLevelAdvanced,
		CurrentLevel:  ProficiencyLevelBeginner,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SkillGapEntry: %v", err)
	}

	var decoded SkillGapEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SkillGapEntry: %v", err)
	}

	if decoded.SkillName != original.SkillName {
		t.Errorf("SkillName mismatch: expected %q, got %q", original.SkillName, decoded.SkillName)
	}
	if decoded.RequiredLevel != original.RequiredLevel {
		t.Errorf("RequiredLevel mismatch")
	}
	if decoded.CurrentLevel != original.CurrentLevel {
		t.Errorf("CurrentLevel mismatch")
	}
}

func TestChecklistTemplateJSONRoundTrip(t *testing.T) {
	roleType := "developer"
	now := time.Now().UTC().Truncate(time.Second)
	original := ChecklistTemplate{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Type:      ChecklistTypeOnboarding,
		Name:      "Dev Onboarding",
		RoleType:  &roleType,
		Tasks:     json.RawMessage(`[{"title":"Setup IDE"}]`),
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ChecklistTemplate: %v", err)
	}

	var decoded ChecklistTemplate
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ChecklistTemplate: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: expected %q, got %q", original.Type, decoded.Type)
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if !decoded.IsActive {
		t.Errorf("IsActive mismatch: expected true, got false")
	}
	if decoded.RoleType == nil || *decoded.RoleType != *original.RoleType {
		t.Errorf("RoleType mismatch")
	}
	if string(decoded.Tasks) != string(original.Tasks) {
		t.Errorf("Tasks mismatch: expected %s, got %s", original.Tasks, decoded.Tasks)
	}
}

func TestChecklistJSONRoundTrip(t *testing.T) {
	templateID := uuid.New()
	startedAt := time.Now().UTC().Truncate(time.Second)
	now := time.Now().UTC().Truncate(time.Second)
	original := Checklist{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		TemplateID:    &templateID,
		UserID:        uuid.New(),
		Type:          ChecklistTypeOnboarding,
		Status:        ChecklistStatusInProgress,
		CompletionPct: 45.5,
		StartedAt:     &startedAt,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Checklist: %v", err)
	}

	var decoded Checklist
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Checklist: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.CompletionPct != original.CompletionPct {
		t.Errorf("CompletionPct mismatch: expected %f, got %f", original.CompletionPct, decoded.CompletionPct)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.TemplateID == nil || *decoded.TemplateID != *original.TemplateID {
		t.Errorf("TemplateID mismatch")
	}
}

func TestChecklistTaskJSONRoundTrip(t *testing.T) {
	desc := "Set up development environment"
	assigneeID := uuid.New()
	dueDate := time.Now().UTC().Add(7 * 24 * time.Hour).Truncate(time.Second)
	now := time.Now().UTC().Truncate(time.Second)
	original := ChecklistTask{
		ID:          uuid.New(),
		ChecklistID: uuid.New(),
		Title:       "Setup IDE",
		Description: &desc,
		AssigneeID:  &assigneeID,
		Status:      TaskStatusPending,
		DueDate:     &dueDate,
		SortOrder:   1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ChecklistTask: %v", err)
	}

	var decoded ChecklistTask
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ChecklistTask: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: expected %q, got %q", original.Title, decoded.Title)
	}
	if decoded.SortOrder != original.SortOrder {
		t.Errorf("SortOrder mismatch: expected %d, got %d", original.SortOrder, decoded.SortOrder)
	}
	if decoded.AssigneeID == nil || *decoded.AssigneeID != *original.AssigneeID {
		t.Errorf("AssigneeID mismatch")
	}
}

func TestRosterJSONRoundTrip(t *testing.T) {
	teamID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	original := Roster{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		TeamID:      &teamID,
		Name:        "March Roster",
		PeriodStart: now,
		PeriodEnd:   now.Add(30 * 24 * time.Hour),
		Status:      RosterStatusDraft,
		Shifts:      json.RawMessage(`[{"day":"Monday","shift":"morning"}]`),
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Roster: %v", err)
	}

	var decoded Roster
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Roster: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.TeamID == nil || *decoded.TeamID != *original.TeamID {
		t.Errorf("TeamID mismatch")
	}
	if string(decoded.Shifts) != string(original.Shifts) {
		t.Errorf("Shifts mismatch")
	}
}

func TestLeaveRecordJSONRoundTrip(t *testing.T) {
	approvedBy := uuid.New()
	notes := "Annual leave"
	now := time.Now().UTC().Truncate(time.Second)
	original := LeaveRecord{
		ID:         uuid.New(),
		TenantID:   uuid.New(),
		UserID:     uuid.New(),
		LeaveType:  "annual",
		StartDate:  now,
		EndDate:    now.Add(5 * 24 * time.Hour),
		Status:     LeaveStatusApproved,
		ApprovedBy: &approvedBy,
		Notes:      &notes,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal LeaveRecord: %v", err)
	}

	var decoded LeaveRecord
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal LeaveRecord: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.LeaveType != original.LeaveType {
		t.Errorf("LeaveType mismatch: expected %q, got %q", original.LeaveType, decoded.LeaveType)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.ApprovedBy == nil || *decoded.ApprovedBy != *original.ApprovedBy {
		t.Errorf("ApprovedBy mismatch")
	}
	if decoded.Notes == nil || *decoded.Notes != *original.Notes {
		t.Errorf("Notes mismatch")
	}
}

func TestCapacityAllocationJSONRoundTrip(t *testing.T) {
	projectID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	original := CapacityAllocation{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		UserID:        uuid.New(),
		ProjectID:     &projectID,
		AllocationPct: 75.0,
		PeriodStart:   now,
		PeriodEnd:     now.Add(30 * 24 * time.Hour),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CapacityAllocation: %v", err)
	}

	var decoded CapacityAllocation
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CapacityAllocation: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.AllocationPct != original.AllocationPct {
		t.Errorf("AllocationPct mismatch: expected %f, got %f", original.AllocationPct, decoded.AllocationPct)
	}
	if decoded.ProjectID == nil || *decoded.ProjectID != *original.ProjectID {
		t.Errorf("ProjectID mismatch")
	}
}

func TestTrainingRecordJSONRoundTrip(t *testing.T) {
	provider := "Coursera"
	completedAt := time.Now().UTC().Truncate(time.Second)
	expiryDate := time.Now().UTC().Add(365 * 24 * time.Hour).Truncate(time.Second)
	certDocID := uuid.New()
	cost := 499.99
	now := time.Now().UTC().Truncate(time.Second)
	original := TrainingRecord{
		ID:               uuid.New(),
		TenantID:         uuid.New(),
		UserID:           uuid.New(),
		Title:            "Kubernetes Admin",
		Provider:         &provider,
		Type:             TrainingTypeCertification,
		Status:           TrainingStatusCompleted,
		CompletedAt:      &completedAt,
		ExpiryDate:       &expiryDate,
		CertificateDocID: &certDocID,
		Cost:             &cost,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal TrainingRecord: %v", err)
	}

	var decoded TrainingRecord
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal TrainingRecord: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: expected %q, got %q", original.Title, decoded.Title)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: expected %q, got %q", original.Type, decoded.Type)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: expected %q, got %q", original.Status, decoded.Status)
	}
	if decoded.Provider == nil || *decoded.Provider != *original.Provider {
		t.Errorf("Provider mismatch")
	}
	if decoded.Cost == nil || *decoded.Cost != *original.Cost {
		t.Errorf("Cost mismatch")
	}
	if decoded.CertificateDocID == nil || *decoded.CertificateDocID != *original.CertificateDocID {
		t.Errorf("CertificateDocID mismatch")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests — heatmap types
// ──────────────────────────────────────────────

func TestHeatmapResponseJSONRoundTrip(t *testing.T) {
	projectID := uuid.New()
	original := HeatmapResponse{
		Periods: []string{"2026-03", "2026-04"},
		Rows: []HeatmapRow{
			{
				ID:          uuid.New(),
				Label:       "John Doe",
				AverageLoad: 85.5,
				Cells: []HeatmapCell{
					{
						Period:        "2026-03",
						AllocationPct: 100.0,
						ProjectCount:  2,
						Projects: []HeatmapProject{
							{ID: projectID, Title: "OPMS", Pct: 60.0},
							{ID: uuid.New(), Title: "CRM", Pct: 40.0},
						},
					},
					{
						Period:        "2026-04",
						AllocationPct: 71.0,
						ProjectCount:  1,
						Projects: []HeatmapProject{
							{ID: projectID, Title: "OPMS", Pct: 71.0},
						},
					},
				},
			},
		},
		Summary: HeatmapSummary{
			TotalUsers:         10,
			OverAllocatedUsers: 3,
			UnderUtilizedUsers: 2,
			AverageUtilization: 78.5,
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal HeatmapResponse: %v", err)
	}

	var decoded HeatmapResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal HeatmapResponse: %v", err)
	}

	if len(decoded.Periods) != 2 {
		t.Errorf("Periods length mismatch: expected 2, got %d", len(decoded.Periods))
	}
	if decoded.Periods[0] != "2026-03" {
		t.Errorf("Periods[0] mismatch: expected %q, got %q", "2026-03", decoded.Periods[0])
	}
	if len(decoded.Rows) != 1 {
		t.Fatalf("Rows length mismatch: expected 1, got %d", len(decoded.Rows))
	}
	if decoded.Rows[0].Label != "John Doe" {
		t.Errorf("Row label mismatch: expected %q, got %q", "John Doe", decoded.Rows[0].Label)
	}
	if decoded.Rows[0].AverageLoad != 85.5 {
		t.Errorf("AverageLoad mismatch: expected 85.5, got %f", decoded.Rows[0].AverageLoad)
	}
	if len(decoded.Rows[0].Cells) != 2 {
		t.Fatalf("Cells length mismatch: expected 2, got %d", len(decoded.Rows[0].Cells))
	}
	if decoded.Rows[0].Cells[0].ProjectCount != 2 {
		t.Errorf("ProjectCount mismatch: expected 2, got %d", decoded.Rows[0].Cells[0].ProjectCount)
	}
	if len(decoded.Rows[0].Cells[0].Projects) != 2 {
		t.Errorf("Projects length mismatch: expected 2, got %d", len(decoded.Rows[0].Cells[0].Projects))
	}
	if decoded.Summary.TotalUsers != 10 {
		t.Errorf("TotalUsers mismatch: expected 10, got %d", decoded.Summary.TotalUsers)
	}
	if decoded.Summary.OverAllocatedUsers != 3 {
		t.Errorf("OverAllocatedUsers mismatch: expected 3, got %d", decoded.Summary.OverAllocatedUsers)
	}
	if decoded.Summary.AverageUtilization != 78.5 {
		t.Errorf("AverageUtilization mismatch: expected 78.5, got %f", decoded.Summary.AverageUtilization)
	}
}

func TestAllocationEntryJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	original := AllocationEntry{
		ID:            uuid.New(),
		TenantID:      uuid.New(),
		UserID:        uuid.New(),
		UserName:      "Jane Smith",
		ProjectID:     uuid.New(),
		ProjectTitle:  "OPMS",
		AllocationPct: 80.0,
		PeriodStart:   now,
		PeriodEnd:     now.Add(30 * 24 * time.Hour),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AllocationEntry: %v", err)
	}

	var decoded AllocationEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AllocationEntry: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.UserName != original.UserName {
		t.Errorf("UserName mismatch: expected %q, got %q", original.UserName, decoded.UserName)
	}
	if decoded.ProjectTitle != original.ProjectTitle {
		t.Errorf("ProjectTitle mismatch: expected %q, got %q", original.ProjectTitle, decoded.ProjectTitle)
	}
	if decoded.AllocationPct != original.AllocationPct {
		t.Errorf("AllocationPct mismatch: expected %f, got %f", original.AllocationPct, decoded.AllocationPct)
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding tests
// ──────────────────────────────────────────────

func TestCreateSkillCategoryRequestJSON(t *testing.T) {
	body := `{"name":"Backend","description":"Backend skills","parentId":"11111111-1111-1111-1111-111111111111"}`

	var req CreateSkillCategoryRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name != "Backend" {
		t.Errorf("Name mismatch: expected %q, got %q", "Backend", req.Name)
	}
	if req.Description == nil || *req.Description != "Backend skills" {
		t.Errorf("Description mismatch")
	}
	if req.ParentID == nil || req.ParentID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("ParentID mismatch")
	}
}

func TestCreateSkillRequestJSON(t *testing.T) {
	body := `{"categoryId":"22222222-2222-2222-2222-222222222222","name":"Go","description":"Go lang"}`

	var req CreateSkillRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name != "Go" {
		t.Errorf("Name mismatch")
	}
	if req.CategoryID.String() != "22222222-2222-2222-2222-222222222222" {
		t.Errorf("CategoryID mismatch")
	}
}

func TestCreateUserSkillRequestJSON(t *testing.T) {
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"skillId":"22222222-2222-2222-2222-222222222222",
		"proficiencyLevel":"advanced",
		"certified":true,
		"certificationName":"AWS SA"
	}`

	var req CreateUserSkillRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.ProficiencyLevel != "advanced" {
		t.Errorf("ProficiencyLevel mismatch")
	}
	if req.Certified == nil || !*req.Certified {
		t.Errorf("Certified mismatch")
	}
	if req.CertificationName == nil || *req.CertificationName != "AWS SA" {
		t.Errorf("CertificationName mismatch")
	}
}

func TestCreateChecklistRequestJSON(t *testing.T) {
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"type":"onboarding",
		"templateId":"22222222-2222-2222-2222-222222222222"
	}`

	var req CreateChecklistRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Type != "onboarding" {
		t.Errorf("Type mismatch")
	}
	if req.TemplateID == nil || req.TemplateID.String() != "22222222-2222-2222-2222-222222222222" {
		t.Errorf("TemplateID mismatch")
	}
}

func TestCreateRosterRequestJSON(t *testing.T) {
	body := `{
		"name":"March Roster",
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-03-31T00:00:00Z"
	}`

	var req CreateRosterRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Name != "March Roster" {
		t.Errorf("Name mismatch")
	}
	if req.PeriodStart.IsZero() {
		t.Errorf("PeriodStart should not be zero")
	}
}

func TestCreateTrainingRecordRequestJSON(t *testing.T) {
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"title":"K8s Admin",
		"provider":"Linux Foundation",
		"type":"certification",
		"cost":395.00
	}`

	var req CreateTrainingRecordRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.Title != "K8s Admin" {
		t.Errorf("Title mismatch")
	}
	if req.Type != "certification" {
		t.Errorf("Type mismatch")
	}
	if req.Provider == nil || *req.Provider != "Linux Foundation" {
		t.Errorf("Provider mismatch")
	}
	if req.Cost == nil || *req.Cost != 395.00 {
		t.Errorf("Cost mismatch")
	}
}

func TestCreateAllocationRequestJSON(t *testing.T) {
	body := `{
		"userId":"11111111-1111-1111-1111-111111111111",
		"projectId":"22222222-2222-2222-2222-222222222222",
		"allocationPct":80.0,
		"periodStart":"2026-03-01T00:00:00Z",
		"periodEnd":"2026-06-30T00:00:00Z"
	}`

	var req CreateAllocationRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.UserID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("UserID mismatch")
	}
	if req.ProjectID.String() != "22222222-2222-2222-2222-222222222222" {
		t.Errorf("ProjectID mismatch")
	}
	if req.AllocationPct != 80.0 {
		t.Errorf("AllocationPct mismatch: expected 80.0, got %f", req.AllocationPct)
	}
}

func TestUpdateAllocationRequestJSON(t *testing.T) {
	body := `{"allocationPct":50.0,"periodStart":"2026-04-01T00:00:00Z"}`

	var req UpdateAllocationRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if req.AllocationPct == nil || *req.AllocationPct != 50.0 {
		t.Errorf("AllocationPct mismatch")
	}
	if req.PeriodStart == nil || req.PeriodStart.IsZero() {
		t.Errorf("PeriodStart should be set")
	}
	if req.PeriodEnd != nil {
		t.Errorf("PeriodEnd should be nil")
	}
}

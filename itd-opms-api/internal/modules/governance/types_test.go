package governance

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Constant value tests
// ──────────────────────────────────────────────

func TestPolicyStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Draft":     "draft",
		"InReview":  "in_review",
		"Approved":  "approved",
		"Published": "published",
		"Retired":   "retired",
	}
	actual := map[string]string{
		"Draft":     PolicyStatusDraft,
		"InReview":  PolicyStatusInReview,
		"Approved":  PolicyStatusApproved,
		"Published": PolicyStatusPublished,
		"Retired":   PolicyStatusRetired,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("PolicyStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestActionStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Open":       "open",
		"InProgress": "in_progress",
		"Completed":  "completed",
		"Overdue":    "overdue",
		"Cancelled":  "cancelled",
	}
	actual := map[string]string{
		"Open":       ActionStatusOpen,
		"InProgress": ActionStatusInProgress,
		"Completed":  ActionStatusCompleted,
		"Overdue":    ActionStatusOverdue,
		"Cancelled":  ActionStatusCancelled,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("ActionStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestMeetingStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Scheduled":  "scheduled",
		"InProgress": "in_progress",
		"Completed":  "completed",
		"Cancelled":  "cancelled",
	}
	actual := map[string]string{
		"Scheduled":  MeetingStatusScheduled,
		"InProgress": MeetingStatusInProgress,
		"Completed":  MeetingStatusCompleted,
		"Cancelled":  MeetingStatusCancelled,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("MeetingStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestOKRStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Draft":     "draft",
		"Active":    "active",
		"Completed": "completed",
		"Cancelled": "cancelled",
	}
	actual := map[string]string{
		"Draft":     OKRStatusDraft,
		"Active":    OKRStatusActive,
		"Completed": OKRStatusCompleted,
		"Cancelled": OKRStatusCancelled,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("OKRStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestKRStatusConstants(t *testing.T) {
	expected := map[string]string{
		"OnTrack":  "on_track",
		"AtRisk":   "at_risk",
		"Behind":   "behind",
		"Achieved": "achieved",
	}
	actual := map[string]string{
		"OnTrack":  KRStatusOnTrack,
		"AtRisk":   KRStatusAtRisk,
		"Behind":   KRStatusBehind,
		"Achieved": KRStatusAchieved,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("KRStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestAttestationStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Pending":  "pending",
		"Attested": "attested",
		"Declined": "declined",
		"Overdue":  "overdue",
	}
	actual := map[string]string{
		"Pending":  AttestationPending,
		"Attested": AttestationAttested,
		"Declined": AttestationDeclined,
		"Overdue":  AttestationOverdue,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("Attestation%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestCampaignStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Active":    "active",
		"Completed": "completed",
		"Cancelled": "cancelled",
	}
	actual := map[string]string{
		"Active":    CampaignStatusActive,
		"Completed": CampaignStatusCompleted,
		"Cancelled": CampaignStatusCancelled,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("CampaignStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests — domain types
// ──────────────────────────────────────────────

func TestPolicyJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	ownerID := uuid.New()
	createdBy := uuid.New()
	desc := "Policy description"
	scopeID := uuid.New()

	original := Policy{
		ID:             id,
		TenantID:       tenantID,
		Title:          "Information Security Policy",
		Description:    &desc,
		Category:       "security",
		Tags:           []string{"security", "compliance"},
		ScopeType:      "organization",
		ScopeTenantIDs: []uuid.UUID{scopeID},
		Status:         PolicyStatusDraft,
		Version:        1,
		Content:        "Policy content goes here",
		EffectiveDate:  &now,
		ReviewDate:     &now,
		ExpiryDate:     &now,
		OwnerID:        &ownerID,
		CreatedBy:      createdBy,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Policy: %v", err)
	}

	var decoded Policy
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Policy: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TenantID != original.TenantID {
		t.Errorf("TenantID mismatch: got %s, want %s", decoded.TenantID, original.TenantID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if decoded.Category != original.Category {
		t.Errorf("Category mismatch: got %q, want %q", decoded.Category, original.Category)
	}
	if len(decoded.Tags) != 2 {
		t.Errorf("Tags length mismatch: got %d, want 2", len(decoded.Tags))
	}
	if decoded.Status != PolicyStatusDraft {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, PolicyStatusDraft)
	}
	if decoded.Version != 1 {
		t.Errorf("Version mismatch: got %d, want 1", decoded.Version)
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if decoded.OwnerID == nil || *decoded.OwnerID != ownerID {
		t.Errorf("OwnerID mismatch: got %v, want %v", decoded.OwnerID, &ownerID)
	}
	if decoded.CreatedBy != createdBy {
		t.Errorf("CreatedBy mismatch: got %s, want %s", decoded.CreatedBy, createdBy)
	}
	if len(decoded.ScopeTenantIDs) != 1 {
		t.Errorf("ScopeTenantIDs length mismatch: got %d, want 1", len(decoded.ScopeTenantIDs))
	}
}

func TestPolicyJSON_FieldNames(t *testing.T) {
	now := time.Now().UTC()
	policy := Policy{
		ID:        uuid.New(),
		TenantID:  uuid.New(),
		Title:     "Test",
		Category:  "test",
		Status:    PolicyStatusDraft,
		Version:   1,
		Content:   "content",
		CreatedBy: uuid.New(),
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(policy)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "title", "description", "category", "tags",
		"scopeType", "scopeTenantIds", "status", "version", "content",
		"effectiveDate", "reviewDate", "expiryDate", "ownerId",
		"createdBy", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized Policy", field)
		}
	}
}

func TestPolicyVersionJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	policyID := uuid.New()
	createdBy := uuid.New()
	changes := "Updated security section"

	original := PolicyVersion{
		ID:             id,
		PolicyID:       policyID,
		Version:        2,
		Title:          "Updated Policy",
		Content:        "Updated content",
		ChangesSummary: &changes,
		CreatedBy:      createdBy,
		CreatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal PolicyVersion: %v", err)
	}

	var decoded PolicyVersion
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PolicyVersion: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.PolicyID != policyID {
		t.Errorf("PolicyID mismatch: got %s, want %s", decoded.PolicyID, policyID)
	}
	if decoded.Version != 2 {
		t.Errorf("Version mismatch: got %d, want 2", decoded.Version)
	}
	if decoded.ChangesSummary == nil || *decoded.ChangesSummary != changes {
		t.Errorf("ChangesSummary mismatch: got %v, want %q", decoded.ChangesSummary, changes)
	}
}

func TestMeetingJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	organizerID := uuid.New()
	attendee1 := uuid.New()
	attendee2 := uuid.New()
	meetingType := "board"
	agenda := "Q1 review"
	minutes := "Discussed Q1 results"
	location := "Conference Room A"
	duration := 60
	recurrence := "RRULE:FREQ=MONTHLY"
	template := "Standard board meeting"

	original := Meeting{
		ID:              id,
		TenantID:        tenantID,
		Title:           "Board Meeting",
		MeetingType:     &meetingType,
		Agenda:          &agenda,
		Minutes:         &minutes,
		Location:        &location,
		ScheduledAt:     now,
		DurationMinutes: &duration,
		RecurrenceRule:  &recurrence,
		TemplateAgenda:  &template,
		AttendeeIDs:     []uuid.UUID{attendee1, attendee2},
		OrganizerID:     organizerID,
		Status:          MeetingStatusScheduled,
		CreatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Meeting: %v", err)
	}

	var decoded Meeting
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Meeting: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.MeetingType == nil || *decoded.MeetingType != meetingType {
		t.Errorf("MeetingType mismatch: got %v, want %q", decoded.MeetingType, meetingType)
	}
	if decoded.Status != MeetingStatusScheduled {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, MeetingStatusScheduled)
	}
	if len(decoded.AttendeeIDs) != 2 {
		t.Errorf("AttendeeIDs length mismatch: got %d, want 2", len(decoded.AttendeeIDs))
	}
	if decoded.DurationMinutes == nil || *decoded.DurationMinutes != 60 {
		t.Errorf("DurationMinutes mismatch: got %v, want 60", decoded.DurationMinutes)
	}
	if decoded.OrganizerID != organizerID {
		t.Errorf("OrganizerID mismatch: got %s, want %s", decoded.OrganizerID, organizerID)
	}
}

func TestMeetingDecisionJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	meetingID := uuid.New()
	tenantID := uuid.New()
	decidedBy := uuid.New()
	evidenceRef := uuid.New()
	rationale := "Based on Q1 data"
	impact := "Affects all departments"

	original := MeetingDecision{
		ID:               id,
		MeetingID:        meetingID,
		TenantID:         tenantID,
		DecisionNumber:   "DEC-001",
		Title:            "Budget Increase",
		Description:      "Increase Q2 budget by 10%",
		Rationale:        &rationale,
		ImpactAssessment: &impact,
		DecidedByIDs:     []uuid.UUID{decidedBy},
		Status:           "approved",
		EvidenceRefs:     []uuid.UUID{evidenceRef},
		CreatedAt:        now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal MeetingDecision: %v", err)
	}

	var decoded MeetingDecision
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal MeetingDecision: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.DecisionNumber != "DEC-001" {
		t.Errorf("DecisionNumber mismatch: got %q, want %q", decoded.DecisionNumber, "DEC-001")
	}
	if decoded.Rationale == nil || *decoded.Rationale != rationale {
		t.Errorf("Rationale mismatch: got %v, want %q", decoded.Rationale, rationale)
	}
	if len(decoded.DecidedByIDs) != 1 {
		t.Errorf("DecidedByIDs length mismatch: got %d, want 1", len(decoded.DecidedByIDs))
	}
	if len(decoded.EvidenceRefs) != 1 {
		t.Errorf("EvidenceRefs length mismatch: got %d, want 1", len(decoded.EvidenceRefs))
	}
}

func TestActionItemJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	sourceID := uuid.New()
	ownerID := uuid.New()
	desc := "Follow up with vendor"
	evidence := "Email confirmation received"
	completedAt := now

	original := ActionItem{
		ID:                 id,
		TenantID:           tenantID,
		SourceType:         "meeting",
		SourceID:           sourceID,
		Title:              "Follow up action",
		Description:        &desc,
		OwnerID:            ownerID,
		DueDate:            now,
		Status:             ActionStatusOpen,
		CompletionEvidence: &evidence,
		CompletedAt:        &completedAt,
		Priority:           "high",
		CreatedAt:          now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal ActionItem: %v", err)
	}

	var decoded ActionItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal ActionItem: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.SourceType != "meeting" {
		t.Errorf("SourceType mismatch: got %q, want %q", decoded.SourceType, "meeting")
	}
	if decoded.Status != ActionStatusOpen {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, ActionStatusOpen)
	}
	if decoded.Priority != "high" {
		t.Errorf("Priority mismatch: got %q, want %q", decoded.Priority, "high")
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if decoded.CompletionEvidence == nil || *decoded.CompletionEvidence != evidence {
		t.Errorf("CompletionEvidence mismatch: got %v, want %q", decoded.CompletionEvidence, evidence)
	}
}

func TestOKRJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	parentID := uuid.New()
	scopeID := uuid.New()
	ownerID := uuid.New()
	progress := 75.5
	targetVal := 100.0
	currentVal := 75.0
	unit := "percent"
	krID := uuid.New()

	original := OKR{
		ID:            id,
		TenantID:      tenantID,
		ParentID:      &parentID,
		Level:         "organization",
		ScopeID:       &scopeID,
		Objective:     "Increase customer satisfaction",
		Period:        "Q1-2026",
		OwnerID:       ownerID,
		Status:        OKRStatusActive,
		ProgressPct:   &progress,
		ScoringMethod: "percentage",
		CreatedAt:     now,
		KeyResults: []KeyResult{
			{
				ID:           krID,
				OKRID:        id,
				Title:        "Achieve NPS score of 80",
				TargetValue:  &targetVal,
				CurrentValue: &currentVal,
				Unit:         &unit,
				Status:       KRStatusOnTrack,
				UpdatedAt:    now,
			},
		},
		Children: []OKR{},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal OKR: %v", err)
	}

	var decoded OKR
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal OKR: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.ParentID == nil || *decoded.ParentID != parentID {
		t.Errorf("ParentID mismatch: got %v, want %v", decoded.ParentID, &parentID)
	}
	if decoded.Objective != original.Objective {
		t.Errorf("Objective mismatch: got %q, want %q", decoded.Objective, original.Objective)
	}
	if decoded.Period != "Q1-2026" {
		t.Errorf("Period mismatch: got %q, want %q", decoded.Period, "Q1-2026")
	}
	if decoded.Status != OKRStatusActive {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, OKRStatusActive)
	}
	if decoded.ProgressPct == nil || *decoded.ProgressPct != 75.5 {
		t.Errorf("ProgressPct mismatch: got %v, want 75.5", decoded.ProgressPct)
	}
	if decoded.ScoringMethod != "percentage" {
		t.Errorf("ScoringMethod mismatch: got %q, want %q", decoded.ScoringMethod, "percentage")
	}
	if len(decoded.KeyResults) != 1 {
		t.Fatalf("KeyResults length mismatch: got %d, want 1", len(decoded.KeyResults))
	}
	kr := decoded.KeyResults[0]
	if kr.ID != krID {
		t.Errorf("KeyResult ID mismatch: got %s, want %s", kr.ID, krID)
	}
	if kr.Title != "Achieve NPS score of 80" {
		t.Errorf("KeyResult Title mismatch: got %q", kr.Title)
	}
	if kr.TargetValue == nil || *kr.TargetValue != 100.0 {
		t.Errorf("KeyResult TargetValue mismatch: got %v, want 100.0", kr.TargetValue)
	}
	if kr.Status != KRStatusOnTrack {
		t.Errorf("KeyResult Status mismatch: got %q, want %q", kr.Status, KRStatusOnTrack)
	}
}

func TestKeyResultJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	okrID := uuid.New()
	target := 100.0
	current := 42.0
	unit := "count"

	original := KeyResult{
		ID:           id,
		OKRID:        okrID,
		Title:        "Reduce ticket resolution time",
		TargetValue:  &target,
		CurrentValue: &current,
		Unit:         &unit,
		Status:       KRStatusAtRisk,
		UpdatedAt:    now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KeyResult: %v", err)
	}

	var decoded KeyResult
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KeyResult: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.OKRID != okrID {
		t.Errorf("OKRID mismatch: got %s, want %s", decoded.OKRID, okrID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.TargetValue == nil || *decoded.TargetValue != target {
		t.Errorf("TargetValue mismatch: got %v, want %v", decoded.TargetValue, target)
	}
	if decoded.CurrentValue == nil || *decoded.CurrentValue != current {
		t.Errorf("CurrentValue mismatch: got %v, want %v", decoded.CurrentValue, current)
	}
	if decoded.Unit == nil || *decoded.Unit != unit {
		t.Errorf("Unit mismatch: got %v, want %q", decoded.Unit, unit)
	}
	if decoded.Status != KRStatusAtRisk {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, KRStatusAtRisk)
	}
}

func TestKPIJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	ownerID := uuid.New()
	desc := "KPI description"
	formula := "SUM(resolved) / SUM(total)"
	target := 95.0
	warning := 90.0
	critical := 80.0
	current := 92.5
	unit := "percent"

	original := KPI{
		ID:                id,
		TenantID:          tenantID,
		Name:              "Resolution Rate",
		Description:       &desc,
		Formula:           &formula,
		TargetValue:       &target,
		WarningThreshold:  &warning,
		CriticalThreshold: &critical,
		CurrentValue:      &current,
		Unit:              &unit,
		Frequency:         "monthly",
		OwnerID:           &ownerID,
		LastUpdatedAt:     &now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KPI: %v", err)
	}

	var decoded KPI
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KPI: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Name != "Resolution Rate" {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, "Resolution Rate")
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if decoded.Formula == nil || *decoded.Formula != formula {
		t.Errorf("Formula mismatch: got %v, want %q", decoded.Formula, formula)
	}
	if decoded.TargetValue == nil || *decoded.TargetValue != target {
		t.Errorf("TargetValue mismatch: got %v, want %v", decoded.TargetValue, target)
	}
	if decoded.WarningThreshold == nil || *decoded.WarningThreshold != warning {
		t.Errorf("WarningThreshold mismatch: got %v, want %v", decoded.WarningThreshold, warning)
	}
	if decoded.CriticalThreshold == nil || *decoded.CriticalThreshold != critical {
		t.Errorf("CriticalThreshold mismatch: got %v, want %v", decoded.CriticalThreshold, critical)
	}
	if decoded.CurrentValue == nil || *decoded.CurrentValue != current {
		t.Errorf("CurrentValue mismatch: got %v, want %v", decoded.CurrentValue, current)
	}
	if decoded.Unit == nil || *decoded.Unit != unit {
		t.Errorf("Unit mismatch: got %v, want %q", decoded.Unit, unit)
	}
	if decoded.Frequency != "monthly" {
		t.Errorf("Frequency mismatch: got %q, want %q", decoded.Frequency, "monthly")
	}
	if decoded.OwnerID == nil || *decoded.OwnerID != ownerID {
		t.Errorf("OwnerID mismatch: got %v, want %v", decoded.OwnerID, &ownerID)
	}
}

func TestRACIMatrixJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	entityID := uuid.New()
	createdBy := uuid.New()
	desc := "RACI for project X"
	entryID := uuid.New()
	accountableID := uuid.New()
	responsibleID := uuid.New()
	consultedID := uuid.New()
	informedID := uuid.New()
	notes := "Entry notes"

	original := RACIMatrix{
		ID:          id,
		TenantID:    tenantID,
		Title:       "Project X RACI",
		EntityType:  "project",
		EntityID:    &entityID,
		Description: &desc,
		Status:      "active",
		CreatedBy:   createdBy,
		CreatedAt:   now,
		UpdatedAt:   now,
		Entries: []RACIEntry{
			{
				ID:             entryID,
				MatrixID:       id,
				Activity:       "Code Review",
				ResponsibleIDs: []uuid.UUID{responsibleID},
				AccountableID:  accountableID,
				ConsultedIDs:   []uuid.UUID{consultedID},
				InformedIDs:    []uuid.UUID{informedID},
				Notes:          &notes,
			},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal RACIMatrix: %v", err)
	}

	var decoded RACIMatrix
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal RACIMatrix: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.Title != "Project X RACI" {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, "Project X RACI")
	}
	if decoded.EntityType != "project" {
		t.Errorf("EntityType mismatch: got %q, want %q", decoded.EntityType, "project")
	}
	if decoded.EntityID == nil || *decoded.EntityID != entityID {
		t.Errorf("EntityID mismatch: got %v, want %v", decoded.EntityID, &entityID)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if len(decoded.Entries) != 1 {
		t.Fatalf("Entries length mismatch: got %d, want 1", len(decoded.Entries))
	}
	entry := decoded.Entries[0]
	if entry.Activity != "Code Review" {
		t.Errorf("Entry Activity mismatch: got %q, want %q", entry.Activity, "Code Review")
	}
	if entry.AccountableID != accountableID {
		t.Errorf("Entry AccountableID mismatch: got %s, want %s", entry.AccountableID, accountableID)
	}
	if len(entry.ResponsibleIDs) != 1 {
		t.Errorf("Entry ResponsibleIDs length mismatch: got %d, want 1", len(entry.ResponsibleIDs))
	}
	if len(entry.ConsultedIDs) != 1 {
		t.Errorf("Entry ConsultedIDs length mismatch: got %d, want 1", len(entry.ConsultedIDs))
	}
	if len(entry.InformedIDs) != 1 {
		t.Errorf("Entry InformedIDs length mismatch: got %d, want 1", len(entry.InformedIDs))
	}
	if entry.Notes == nil || *entry.Notes != notes {
		t.Errorf("Entry Notes mismatch: got %v, want %q", entry.Notes, notes)
	}
}

func TestPolicyAttestationJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	policyID := uuid.New()
	userID := uuid.New()
	tenantID := uuid.New()
	campaignID := uuid.New()

	original := PolicyAttestation{
		ID:             id,
		PolicyID:       policyID,
		PolicyVersion:  3,
		UserID:         userID,
		TenantID:       tenantID,
		AttestedAt:     &now,
		Status:         AttestationAttested,
		CampaignID:     &campaignID,
		ReminderSentAt: &now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal PolicyAttestation: %v", err)
	}

	var decoded PolicyAttestation
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal PolicyAttestation: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.PolicyVersion != 3 {
		t.Errorf("PolicyVersion mismatch: got %d, want 3", decoded.PolicyVersion)
	}
	if decoded.Status != AttestationAttested {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, AttestationAttested)
	}
	if decoded.CampaignID == nil || *decoded.CampaignID != campaignID {
		t.Errorf("CampaignID mismatch: got %v, want %v", decoded.CampaignID, &campaignID)
	}
}

func TestAttestationCampaignJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	policyID := uuid.New()
	createdBy := uuid.New()
	user1 := uuid.New()
	user2 := uuid.New()
	rate := 85.5

	original := AttestationCampaign{
		ID:             id,
		TenantID:       tenantID,
		PolicyID:       policyID,
		PolicyVersion:  2,
		TargetScope:    "department",
		TargetUserIDs:  []uuid.UUID{user1, user2},
		DueDate:        now,
		Status:         CampaignStatusActive,
		CompletionRate: &rate,
		CreatedBy:      createdBy,
		CreatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AttestationCampaign: %v", err)
	}

	var decoded AttestationCampaign
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AttestationCampaign: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TargetScope != "department" {
		t.Errorf("TargetScope mismatch: got %q, want %q", decoded.TargetScope, "department")
	}
	if len(decoded.TargetUserIDs) != 2 {
		t.Errorf("TargetUserIDs length mismatch: got %d, want 2", len(decoded.TargetUserIDs))
	}
	if decoded.CompletionRate == nil || *decoded.CompletionRate != rate {
		t.Errorf("CompletionRate mismatch: got %v, want %v", decoded.CompletionRate, rate)
	}
	if decoded.Status != CampaignStatusActive {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, CampaignStatusActive)
	}
}

func TestVersionDiffJSON_RoundTrip(t *testing.T) {
	original := VersionDiff{
		V1:         1,
		V2:         2,
		OldTitle:   "Old Title",
		NewTitle:   "New Title",
		OldContent: "Old content",
		NewContent: "New content",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal VersionDiff: %v", err)
	}

	var decoded VersionDiff
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal VersionDiff: %v", err)
	}

	if decoded.V1 != 1 || decoded.V2 != 2 {
		t.Errorf("version mismatch: got v1=%d v2=%d, want v1=1 v2=2", decoded.V1, decoded.V2)
	}
	if decoded.OldTitle != "Old Title" || decoded.NewTitle != "New Title" {
		t.Errorf("title mismatch: got old=%q new=%q", decoded.OldTitle, decoded.NewTitle)
	}
	if decoded.OldContent != "Old content" || decoded.NewContent != "New content" {
		t.Errorf("content mismatch: got old=%q new=%q", decoded.OldContent, decoded.NewContent)
	}
}

func TestAttestationStatusJSON_RoundTrip(t *testing.T) {
	original := AttestationStatus{
		TotalUsers:     100,
		AttestedCount:  85,
		PendingCount:   10,
		OverdueCount:   5,
		CompletionRate: 85.0,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AttestationStatus: %v", err)
	}

	var decoded AttestationStatus
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AttestationStatus: %v", err)
	}

	if decoded != original {
		t.Errorf("AttestationStatus mismatch: got %+v, want %+v", decoded, original)
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests — request types
// ──────────────────────────────────────────────

func TestCreatePolicyRequestJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	ownerID := uuid.New()
	desc := "Description"

	original := CreatePolicyRequest{
		Title:         "New Policy",
		Description:   &desc,
		Category:      "security",
		Tags:          []string{"tag1", "tag2"},
		Content:       "Policy content",
		EffectiveDate: &now,
		OwnerID:       &ownerID,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreatePolicyRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Category != original.Category {
		t.Errorf("Category mismatch: got %q, want %q", decoded.Category, original.Category)
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if len(decoded.Tags) != 2 {
		t.Errorf("Tags length mismatch: got %d, want 2", len(decoded.Tags))
	}
}

func TestCreateOKRRequestJSON_RoundTrip(t *testing.T) {
	parentID := uuid.New()
	scopeID := uuid.New()
	ownerID := uuid.New()
	method := "percentage"

	original := CreateOKRRequest{
		ParentID:      &parentID,
		Level:         "team",
		ScopeID:       &scopeID,
		Objective:     "Improve delivery speed",
		Period:        "Q2-2026",
		OwnerID:       ownerID,
		ScoringMethod: &method,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateOKRRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Level != "team" {
		t.Errorf("Level mismatch: got %q, want %q", decoded.Level, "team")
	}
	if decoded.Objective != original.Objective {
		t.Errorf("Objective mismatch: got %q, want %q", decoded.Objective, original.Objective)
	}
	if decoded.OwnerID != ownerID {
		t.Errorf("OwnerID mismatch: got %s, want %s", decoded.OwnerID, ownerID)
	}
}

func TestCreateKPIRequestJSON_RoundTrip(t *testing.T) {
	desc := "Resolution rate KPI"
	formula := "resolved/total*100"
	target := 95.0
	warning := 90.0
	critical := 80.0
	unit := "percent"
	freq := "weekly"
	ownerID := uuid.New()

	original := CreateKPIRequest{
		Name:              "Resolution Rate",
		Description:       &desc,
		Formula:           &formula,
		TargetValue:       &target,
		WarningThreshold:  &warning,
		CriticalThreshold: &critical,
		Unit:              &unit,
		Frequency:         &freq,
		OwnerID:           &ownerID,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateKPIRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Name != "Resolution Rate" {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, "Resolution Rate")
	}
	if decoded.TargetValue == nil || *decoded.TargetValue != target {
		t.Errorf("TargetValue mismatch: got %v, want %v", decoded.TargetValue, target)
	}
}

func TestCreateRACIMatrixRequestJSON_RoundTrip(t *testing.T) {
	entityID := uuid.New()
	desc := "Project responsibilities"

	original := CreateRACIMatrixRequest{
		Title:       "Project RACI",
		EntityType:  "project",
		EntityID:    &entityID,
		Description: &desc,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateRACIMatrixRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Title != "Project RACI" {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, "Project RACI")
	}
	if decoded.EntityType != "project" {
		t.Errorf("EntityType mismatch: got %q, want %q", decoded.EntityType, "project")
	}
	if decoded.EntityID == nil || *decoded.EntityID != entityID {
		t.Errorf("EntityID mismatch: got %v, want %v", decoded.EntityID, &entityID)
	}
}

func TestCreateMeetingRequestJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	meetingType := "board"
	agenda := "Review Q1 results"
	location := "Room A"
	duration := 90
	attendee := uuid.New()

	original := CreateMeetingRequest{
		Title:           "Q1 Board Meeting",
		MeetingType:     &meetingType,
		Agenda:          &agenda,
		Location:        &location,
		ScheduledAt:     now,
		DurationMinutes: &duration,
		AttendeeIDs:     []uuid.UUID{attendee},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CreateMeetingRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Title != "Q1 Board Meeting" {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, "Q1 Board Meeting")
	}
	if decoded.DurationMinutes == nil || *decoded.DurationMinutes != 90 {
		t.Errorf("DurationMinutes mismatch: got %v, want 90", decoded.DurationMinutes)
	}
	if len(decoded.AttendeeIDs) != 1 {
		t.Errorf("AttendeeIDs length mismatch: got %d, want 1", len(decoded.AttendeeIDs))
	}
}

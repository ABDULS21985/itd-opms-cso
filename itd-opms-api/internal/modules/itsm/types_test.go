package itsm

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// CalculatePriority — priority matrix tests
// ──────────────────────────────────────────────

func TestCalculatePriority_AllCombinations(t *testing.T) {
	tests := []struct {
		urgency  string
		impact   string
		expected string
	}{
		// critical urgency
		{"critical", "critical", TicketPriorityP1Critical},
		{"critical", "high", TicketPriorityP1Critical},
		{"critical", "medium", TicketPriorityP2High},
		{"critical", "low", TicketPriorityP3Medium},
		// high urgency
		{"high", "critical", TicketPriorityP1Critical},
		{"high", "high", TicketPriorityP2High},
		{"high", "medium", TicketPriorityP3Medium},
		{"high", "low", TicketPriorityP3Medium},
		// medium urgency
		{"medium", "critical", TicketPriorityP2High},
		{"medium", "high", TicketPriorityP3Medium},
		{"medium", "medium", TicketPriorityP3Medium},
		{"medium", "low", TicketPriorityP3Medium},
		// low urgency
		{"low", "critical", TicketPriorityP3Medium},
		{"low", "high", TicketPriorityP3Medium},
		{"low", "medium", TicketPriorityP3Medium},
		{"low", "low", TicketPriorityP4Low},
	}

	for _, tt := range tests {
		name := tt.urgency + "_" + tt.impact
		t.Run(name, func(t *testing.T) {
			got := CalculatePriority(tt.urgency, tt.impact)
			if got != tt.expected {
				t.Errorf("CalculatePriority(%q, %q) = %q, want %q",
					tt.urgency, tt.impact, got, tt.expected)
			}
		})
	}
}

func TestCalculatePriority_UnknownUrgency(t *testing.T) {
	got := CalculatePriority("unknown", "critical")
	if got != TicketPriorityP3Medium {
		t.Errorf("CalculatePriority(unknown, critical) = %q, want %q", got, TicketPriorityP3Medium)
	}
}

func TestCalculatePriority_UnknownImpact(t *testing.T) {
	got := CalculatePriority("critical", "unknown")
	if got != TicketPriorityP3Medium {
		t.Errorf("CalculatePriority(critical, unknown) = %q, want %q", got, TicketPriorityP3Medium)
	}
}

func TestCalculatePriority_BothUnknown(t *testing.T) {
	got := CalculatePriority("unknown", "unknown")
	if got != TicketPriorityP3Medium {
		t.Errorf("CalculatePriority(unknown, unknown) = %q, want %q", got, TicketPriorityP3Medium)
	}
}

func TestCalculatePriority_EmptyStrings(t *testing.T) {
	got := CalculatePriority("", "")
	if got != TicketPriorityP3Medium {
		t.Errorf("CalculatePriority('', '') = %q, want %q", got, TicketPriorityP3Medium)
	}
}

func TestCalculatePriority_CaseSensitive(t *testing.T) {
	// The function uses lowercase keys — uppercase should fall through to default.
	got := CalculatePriority("Critical", "High")
	if got != TicketPriorityP3Medium {
		t.Errorf("CalculatePriority(Critical, High) = %q, want %q (case sensitive)", got, TicketPriorityP3Medium)
	}
}

// ──────────────────────────────────────────────
// IsValidTicketTransition — state machine tests
// ──────────────────────────────────────────────

func TestIsValidTicketTransition_ValidTransitions(t *testing.T) {
	validCases := []struct {
		from string
		to   string
	}{
		// logged transitions
		{TicketStatusLogged, TicketStatusClassified},
		{TicketStatusLogged, TicketStatusAssigned},
		{TicketStatusLogged, TicketStatusCancelled},
		// classified transitions
		{TicketStatusClassified, TicketStatusAssigned},
		{TicketStatusClassified, TicketStatusCancelled},
		// assigned transitions
		{TicketStatusAssigned, TicketStatusInProgress},
		{TicketStatusAssigned, TicketStatusCancelled},
		// in_progress transitions
		{TicketStatusInProgress, TicketStatusPendingCustomer},
		{TicketStatusInProgress, TicketStatusPendingVendor},
		{TicketStatusInProgress, TicketStatusResolved},
		{TicketStatusInProgress, TicketStatusCancelled},
		// pending_customer transitions
		{TicketStatusPendingCustomer, TicketStatusInProgress},
		{TicketStatusPendingCustomer, TicketStatusResolved},
		{TicketStatusPendingCustomer, TicketStatusCancelled},
		// pending_vendor transitions
		{TicketStatusPendingVendor, TicketStatusInProgress},
		{TicketStatusPendingVendor, TicketStatusResolved},
		{TicketStatusPendingVendor, TicketStatusCancelled},
		// resolved transitions
		{TicketStatusResolved, TicketStatusClosed},
		{TicketStatusResolved, TicketStatusInProgress}, // reopen
	}

	for _, tc := range validCases {
		name := tc.from + " -> " + tc.to
		t.Run(name, func(t *testing.T) {
			if !IsValidTicketTransition(tc.from, tc.to) {
				t.Errorf("IsValidTicketTransition(%q, %q) = false, want true", tc.from, tc.to)
			}
		})
	}
}

func TestIsValidTicketTransition_InvalidTransitions(t *testing.T) {
	invalidCases := []struct {
		from string
		to   string
	}{
		// Cannot skip states
		{TicketStatusLogged, TicketStatusResolved},
		{TicketStatusLogged, TicketStatusClosed},
		{TicketStatusLogged, TicketStatusInProgress},
		{TicketStatusLogged, TicketStatusPendingCustomer},
		// closed is terminal
		{TicketStatusClosed, TicketStatusLogged},
		{TicketStatusClosed, TicketStatusInProgress},
		{TicketStatusClosed, TicketStatusResolved},
		{TicketStatusClosed, TicketStatusAssigned},
		// cancelled is terminal
		{TicketStatusCancelled, TicketStatusLogged},
		{TicketStatusCancelled, TicketStatusInProgress},
		// classified cannot go back
		{TicketStatusClassified, TicketStatusLogged},
		{TicketStatusClassified, TicketStatusInProgress},
		// assigned cannot go back
		{TicketStatusAssigned, TicketStatusLogged},
		{TicketStatusAssigned, TicketStatusClassified},
		// resolved cannot go to assigned
		{TicketStatusResolved, TicketStatusAssigned},
		// self-transitions
		{TicketStatusLogged, TicketStatusLogged},
		{TicketStatusInProgress, TicketStatusInProgress},
	}

	for _, tc := range invalidCases {
		name := tc.from + " -> " + tc.to
		t.Run(name, func(t *testing.T) {
			if IsValidTicketTransition(tc.from, tc.to) {
				t.Errorf("IsValidTicketTransition(%q, %q) = true, want false", tc.from, tc.to)
			}
		})
	}
}

func TestIsValidTicketTransition_UnknownFromStatus(t *testing.T) {
	if IsValidTicketTransition("nonexistent", TicketStatusAssigned) {
		t.Error("expected false for unknown 'from' status")
	}
}

func TestIsValidTicketTransition_UnknownToStatus(t *testing.T) {
	if IsValidTicketTransition(TicketStatusLogged, "nonexistent") {
		t.Error("expected false for unknown 'to' status")
	}
}

func TestIsValidTicketTransition_EmptyStrings(t *testing.T) {
	if IsValidTicketTransition("", "") {
		t.Error("expected false for empty strings")
	}
}

// ──────────────────────────────────────────────
// Constant value tests
// ──────────────────────────────────────────────

func TestTicketTypeConstants(t *testing.T) {
	expected := map[string]string{
		"TicketTypeIncident":       "incident",
		"TicketTypeServiceRequest": "service_request",
		"TicketTypeProblem":        "problem",
		"TicketTypeChange":         "change",
	}
	actual := map[string]string{
		"TicketTypeIncident":       TicketTypeIncident,
		"TicketTypeServiceRequest": TicketTypeServiceRequest,
		"TicketTypeProblem":        TicketTypeProblem,
		"TicketTypeChange":         TicketTypeChange,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestTicketPriorityConstants(t *testing.T) {
	expected := map[string]string{
		"P1Critical": "P1_critical",
		"P2High":     "P2_high",
		"P3Medium":   "P3_medium",
		"P4Low":      "P4_low",
	}
	actual := map[string]string{
		"P1Critical": TicketPriorityP1Critical,
		"P2High":     TicketPriorityP2High,
		"P3Medium":   TicketPriorityP3Medium,
		"P4Low":      TicketPriorityP4Low,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("TicketPriority%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestTicketUrgencyConstants(t *testing.T) {
	expected := map[string]string{
		"Critical": "critical",
		"High":     "high",
		"Medium":   "medium",
		"Low":      "low",
	}
	actual := map[string]string{
		"Critical": TicketUrgencyCritical,
		"High":     TicketUrgencyHigh,
		"Medium":   TicketUrgencyMedium,
		"Low":      TicketUrgencyLow,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("TicketUrgency%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestTicketImpactConstants(t *testing.T) {
	expected := map[string]string{
		"Critical": "critical",
		"High":     "high",
		"Medium":   "medium",
		"Low":      "low",
	}
	actual := map[string]string{
		"Critical": TicketImpactCritical,
		"High":     TicketImpactHigh,
		"Medium":   TicketImpactMedium,
		"Low":      TicketImpactLow,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("TicketImpact%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestTicketStatusConstants(t *testing.T) {
	expected := map[string]string{
		"Logged":          "logged",
		"Classified":      "classified",
		"Assigned":        "assigned",
		"InProgress":      "in_progress",
		"PendingCustomer": "pending_customer",
		"PendingVendor":   "pending_vendor",
		"Resolved":        "resolved",
		"Closed":          "closed",
		"Cancelled":       "cancelled",
	}
	actual := map[string]string{
		"Logged":          TicketStatusLogged,
		"Classified":      TicketStatusClassified,
		"Assigned":        TicketStatusAssigned,
		"InProgress":      TicketStatusInProgress,
		"PendingCustomer": TicketStatusPendingCustomer,
		"PendingVendor":   TicketStatusPendingVendor,
		"Resolved":        TicketStatusResolved,
		"Closed":          TicketStatusClosed,
		"Cancelled":       TicketStatusCancelled,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("TicketStatus%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestTicketChannelConstants(t *testing.T) {
	expected := map[string]string{
		"Portal": "portal",
		"Email":  "email",
		"Manual": "manual",
		"API":    "api",
	}
	actual := map[string]string{
		"Portal": TicketChannelPortal,
		"Email":  TicketChannelEmail,
		"Manual": TicketChannelManual,
		"API":    TicketChannelAPI,
	}
	for name, want := range expected {
		if actual[name] != want {
			t.Errorf("TicketChannel%s = %q, want %q", name, actual[name], want)
		}
	}
}

func TestCatalogItemStatusConstants(t *testing.T) {
	if CatalogItemStatusActive != "active" {
		t.Errorf("CatalogItemStatusActive = %q, want %q", CatalogItemStatusActive, "active")
	}
	if CatalogItemStatusInactive != "inactive" {
		t.Errorf("CatalogItemStatusInactive = %q, want %q", CatalogItemStatusInactive, "inactive")
	}
	if CatalogItemStatusDeprecated != "deprecated" {
		t.Errorf("CatalogItemStatusDeprecated = %q, want %q", CatalogItemStatusDeprecated, "deprecated")
	}
}

func TestProblemStatusConstants(t *testing.T) {
	if ProblemStatusLogged != "logged" {
		t.Errorf("ProblemStatusLogged = %q, want %q", ProblemStatusLogged, "logged")
	}
	if ProblemStatusInvestigating != "investigating" {
		t.Errorf("ProblemStatusInvestigating = %q, want %q", ProblemStatusInvestigating, "investigating")
	}
	if ProblemStatusRootCauseIdentified != "root_cause_identified" {
		t.Errorf("ProblemStatusRootCauseIdentified = %q, want %q", ProblemStatusRootCauseIdentified, "root_cause_identified")
	}
	if ProblemStatusKnownError != "known_error" {
		t.Errorf("ProblemStatusKnownError = %q, want %q", ProblemStatusKnownError, "known_error")
	}
	if ProblemStatusResolved != "resolved" {
		t.Errorf("ProblemStatusResolved = %q, want %q", ProblemStatusResolved, "resolved")
	}
}

func TestKnownErrorStatusConstants(t *testing.T) {
	if KnownErrorStatusActive != "active" {
		t.Errorf("KnownErrorStatusActive = %q, want %q", KnownErrorStatusActive, "active")
	}
	if KnownErrorStatusResolved != "resolved" {
		t.Errorf("KnownErrorStatusResolved = %q, want %q", KnownErrorStatusResolved, "resolved")
	}
	if KnownErrorStatusRetired != "retired" {
		t.Errorf("KnownErrorStatusRetired = %q, want %q", KnownErrorStatusRetired, "retired")
	}
}

func TestSLABreachTypeConstants(t *testing.T) {
	if SLABreachTypeResponse != "response" {
		t.Errorf("SLABreachTypeResponse = %q, want %q", SLABreachTypeResponse, "response")
	}
	if SLABreachTypeResolution != "resolution" {
		t.Errorf("SLABreachTypeResolution = %q, want %q", SLABreachTypeResolution, "resolution")
	}
}

func TestEscalationTriggerConstants(t *testing.T) {
	if EscalationTriggerSLAWarning != "sla_warning" {
		t.Errorf("EscalationTriggerSLAWarning = %q, want %q", EscalationTriggerSLAWarning, "sla_warning")
	}
	if EscalationTriggerSLABreach != "sla_breach" {
		t.Errorf("EscalationTriggerSLABreach = %q, want %q", EscalationTriggerSLABreach, "sla_breach")
	}
	if EscalationTriggerPriority != "priority" {
		t.Errorf("EscalationTriggerPriority = %q, want %q", EscalationTriggerPriority, "priority")
	}
	if EscalationTriggerManual != "manual" {
		t.Errorf("EscalationTriggerManual = %q, want %q", EscalationTriggerManual, "manual")
	}
}

func TestAutoAssignRuleConstants(t *testing.T) {
	if AutoAssignRuleRoundRobin != "round_robin" {
		t.Errorf("AutoAssignRuleRoundRobin = %q, want %q", AutoAssignRuleRoundRobin, "round_robin")
	}
	if AutoAssignRuleLeastLoaded != "least_loaded" {
		t.Errorf("AutoAssignRuleLeastLoaded = %q, want %q", AutoAssignRuleLeastLoaded, "least_loaded")
	}
	if AutoAssignRuleSkillsBased != "skills_based" {
		t.Errorf("AutoAssignRuleSkillsBased = %q, want %q", AutoAssignRuleSkillsBased, "skills_based")
	}
	if AutoAssignRuleManual != "manual" {
		t.Errorf("AutoAssignRuleManual = %q, want %q", AutoAssignRuleManual, "manual")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestTicketJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	reporterID := uuid.New()
	assigneeID := uuid.New()

	original := Ticket{
		ID:              id,
		TenantID:        tenantID,
		TicketNumber:    "INC-0001",
		Type:            TicketTypeIncident,
		Title:           "Server outage",
		Description:     "The main server is down",
		Priority:        TicketPriorityP1Critical,
		Urgency:         TicketUrgencyCritical,
		Impact:          TicketImpactCritical,
		Status:          TicketStatusLogged,
		Channel:         TicketChannelPortal,
		ReporterID:      reporterID,
		AssigneeID:      &assigneeID,
		IsMajorIncident: true,
		Tags:            []string{"production", "urgent"},
		CustomFields:    json.RawMessage(`{"department":"IT"}`),
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Ticket: %v", err)
	}

	var decoded Ticket
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Ticket: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.TicketNumber != original.TicketNumber {
		t.Errorf("TicketNumber mismatch: got %q, want %q", decoded.TicketNumber, original.TicketNumber)
	}
	if decoded.Type != original.Type {
		t.Errorf("Type mismatch: got %q, want %q", decoded.Type, original.Type)
	}
	if decoded.Priority != original.Priority {
		t.Errorf("Priority mismatch: got %q, want %q", decoded.Priority, original.Priority)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, original.Status)
	}
	if decoded.IsMajorIncident != original.IsMajorIncident {
		t.Errorf("IsMajorIncident mismatch: got %v, want %v", decoded.IsMajorIncident, original.IsMajorIncident)
	}
	if decoded.AssigneeID == nil || *decoded.AssigneeID != assigneeID {
		t.Errorf("AssigneeID mismatch: got %v, want %v", decoded.AssigneeID, &assigneeID)
	}
	if len(decoded.Tags) != 2 {
		t.Errorf("Tags length mismatch: got %d, want 2", len(decoded.Tags))
	}
}

func TestTicketJSON_FieldNames(t *testing.T) {
	ticket := Ticket{
		ID:              uuid.New(),
		TenantID:        uuid.New(),
		TicketNumber:    "SR-001",
		Type:            TicketTypeServiceRequest,
		Title:           "New laptop",
		Description:     "Need new laptop",
		Priority:        TicketPriorityP3Medium,
		Urgency:         TicketUrgencyMedium,
		Impact:          TicketImpactMedium,
		Status:          TicketStatusLogged,
		Channel:         TicketChannelEmail,
		ReporterID:      uuid.New(),
		IsMajorIncident: false,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}

	data, err := json.Marshal(ticket)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var m map[string]json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("failed to unmarshal to map: %v", err)
	}

	expectedFields := []string{
		"id", "tenantId", "ticketNumber", "type", "title", "description",
		"priority", "urgency", "impact", "status", "channel", "reporterId",
		"isMajorIncident", "createdAt", "updatedAt",
	}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("expected JSON field %q not found in serialized Ticket", field)
		}
	}
}

func TestProblemJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	ownerID := uuid.New()
	desc := "Recurring network failures"
	rootCause := "Faulty switch in rack 3A"

	original := Problem{
		ID:            id,
		TenantID:      tenantID,
		ProblemNumber: "PRB-0001",
		Title:         "Network instability",
		Description:   &desc,
		RootCause:     &rootCause,
		Status:        ProblemStatusInvestigating,
		OwnerID:       &ownerID,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal Problem: %v", err)
	}

	var decoded Problem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal Problem: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.ProblemNumber != original.ProblemNumber {
		t.Errorf("ProblemNumber mismatch: got %q, want %q", decoded.ProblemNumber, original.ProblemNumber)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, original.Status)
	}
	if decoded.Description == nil || *decoded.Description != desc {
		t.Errorf("Description mismatch: got %v, want %q", decoded.Description, desc)
	}
	if decoded.RootCause == nil || *decoded.RootCause != rootCause {
		t.Errorf("RootCause mismatch: got %v, want %q", decoded.RootCause, rootCause)
	}
}

func TestKnownErrorJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	problemID := uuid.New()
	desc := "Application crashes when processing large files"
	workaround := "Split files into chunks under 100MB"

	original := KnownError{
		ID:          id,
		ProblemID:   problemID,
		Title:       "Large file crash",
		Description: &desc,
		Workaround:  &workaround,
		Status:      KnownErrorStatusActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal KnownError: %v", err)
	}

	var decoded KnownError
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal KnownError: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, original.ID)
	}
	if decoded.ProblemID != original.ProblemID {
		t.Errorf("ProblemID mismatch: got %s, want %s", decoded.ProblemID, original.ProblemID)
	}
	if decoded.Title != original.Title {
		t.Errorf("Title mismatch: got %q, want %q", decoded.Title, original.Title)
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, original.Status)
	}
}

func TestSLAPolicyJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	calID := uuid.New()
	desc := "Standard SLA for incidents"

	original := SLAPolicy{
		ID:                      id,
		TenantID:                tenantID,
		Name:                    "Standard Incident SLA",
		Description:             &desc,
		PriorityTargets:         json.RawMessage(`{"P1":{"response":15,"resolution":60}}`),
		BusinessHoursCalendarID: &calID,
		IsDefault:               true,
		IsActive:                true,
		CreatedAt:               now,
		UpdatedAt:               now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SLAPolicy: %v", err)
	}

	var decoded SLAPolicy
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SLAPolicy: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.IsDefault != original.IsDefault {
		t.Errorf("IsDefault mismatch: got %v, want %v", decoded.IsDefault, original.IsDefault)
	}
	if decoded.IsActive != original.IsActive {
		t.Errorf("IsActive mismatch: got %v, want %v", decoded.IsActive, original.IsActive)
	}
	if decoded.BusinessHoursCalendarID == nil || *decoded.BusinessHoursCalendarID != calID {
		t.Errorf("BusinessHoursCalendarID mismatch")
	}
}

func TestCatalogItemJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	catID := uuid.New()
	desc := "Standard laptop provisioning"
	delivery := "3-5 business days"

	original := CatalogItem{
		ID:                id,
		TenantID:          tenantID,
		CategoryID:        &catID,
		Name:              "New Laptop Request",
		Description:       &desc,
		ApprovalRequired:  true,
		EntitlementRoles:  []string{"employee", "contractor"},
		EstimatedDelivery: &delivery,
		Status:            CatalogItemStatusActive,
		Version:           1,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CatalogItem: %v", err)
	}

	var decoded CatalogItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CatalogItem: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.ApprovalRequired != original.ApprovalRequired {
		t.Errorf("ApprovalRequired mismatch")
	}
	if decoded.Status != original.Status {
		t.Errorf("Status mismatch: got %q, want %q", decoded.Status, original.Status)
	}
	if decoded.Version != original.Version {
		t.Errorf("Version mismatch: got %d, want %d", decoded.Version, original.Version)
	}
	if len(decoded.EntitlementRoles) != 2 {
		t.Errorf("EntitlementRoles length mismatch: got %d, want 2", len(decoded.EntitlementRoles))
	}
}

func TestCatalogCategoryJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	desc := "Hardware-related requests"
	icon := "laptop"

	original := CatalogCategory{
		ID:          id,
		TenantID:    tenantID,
		Name:        "Hardware",
		Description: &desc,
		Icon:        &icon,
		SortOrder:   1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CatalogCategory: %v", err)
	}

	var decoded CatalogCategory
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CatalogCategory: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.SortOrder != original.SortOrder {
		t.Errorf("SortOrder mismatch: got %d, want %d", decoded.SortOrder, original.SortOrder)
	}
}

func TestCSATSurveyJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	ticketID := uuid.New()
	respID := uuid.New()
	comment := "Great service!"

	original := CSATSurvey{
		ID:           id,
		TicketID:     ticketID,
		RespondentID: respID,
		Rating:       5,
		Comment:      &comment,
		CreatedAt:    now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CSATSurvey: %v", err)
	}

	var decoded CSATSurvey
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CSATSurvey: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Rating != original.Rating {
		t.Errorf("Rating mismatch: got %d, want %d", decoded.Rating, original.Rating)
	}
	if decoded.Comment == nil || *decoded.Comment != comment {
		t.Errorf("Comment mismatch")
	}
}

func TestSupportQueueJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()
	teamID := uuid.New()

	original := SupportQueue{
		ID:             id,
		TenantID:       tenantID,
		Name:           "Level 2 Support",
		TeamID:         &teamID,
		PriorityFilter: []string{"P1_critical", "P2_high"},
		AutoAssignRule: AutoAssignRuleRoundRobin,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal SupportQueue: %v", err)
	}

	var decoded SupportQueue
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal SupportQueue: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.AutoAssignRule != original.AutoAssignRule {
		t.Errorf("AutoAssignRule mismatch: got %q, want %q", decoded.AutoAssignRule, original.AutoAssignRule)
	}
	if decoded.IsActive != original.IsActive {
		t.Errorf("IsActive mismatch")
	}
	if len(decoded.PriorityFilter) != 2 {
		t.Errorf("PriorityFilter length mismatch: got %d, want 2", len(decoded.PriorityFilter))
	}
}

func TestBusinessHoursCalendarJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()

	original := BusinessHoursCalendar{
		ID:        id,
		TenantID:  tenantID,
		Name:      "Standard Business Hours",
		Timezone:  "Asia/Manila",
		Schedule:  json.RawMessage(`{"monday":{"start":"08:00","end":"17:00"}}`),
		Holidays:  json.RawMessage(`["2026-01-01","2026-12-25"]`),
		CreatedAt: now,
		UpdatedAt: now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal BusinessHoursCalendar: %v", err)
	}

	var decoded BusinessHoursCalendar
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal BusinessHoursCalendar: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.Timezone != original.Timezone {
		t.Errorf("Timezone mismatch: got %q, want %q", decoded.Timezone, original.Timezone)
	}
}

func TestEscalationRuleJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	tenantID := uuid.New()

	original := EscalationRule{
		ID:              id,
		TenantID:        tenantID,
		Name:            "P1 SLA Breach Escalation",
		TriggerType:     EscalationTriggerSLABreach,
		TriggerConfig:   json.RawMessage(`{"priority":"P1_critical","threshold_minutes":15}`),
		EscalationChain: json.RawMessage(`[{"level":1,"notifyUserId":"` + uuid.New().String() + `"}]`),
		IsActive:        true,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal EscalationRule: %v", err)
	}

	var decoded EscalationRule
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal EscalationRule: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: got %q, want %q", decoded.Name, original.Name)
	}
	if decoded.TriggerType != original.TriggerType {
		t.Errorf("TriggerType mismatch: got %q, want %q", decoded.TriggerType, original.TriggerType)
	}
	if decoded.IsActive != original.IsActive {
		t.Errorf("IsActive mismatch")
	}
}

func TestTicketStatsJSON_RoundTrip(t *testing.T) {
	original := TicketStats{
		Total:            100,
		OpenCount:        25,
		SLABreachedCount: 3,
		MajorIncidents:   1,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal TicketStats: %v", err)
	}

	var decoded TicketStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal TicketStats: %v", err)
	}

	if decoded.Total != original.Total {
		t.Errorf("Total mismatch: got %d, want %d", decoded.Total, original.Total)
	}
	if decoded.OpenCount != original.OpenCount {
		t.Errorf("OpenCount mismatch: got %d, want %d", decoded.OpenCount, original.OpenCount)
	}
	if decoded.SLABreachedCount != original.SLABreachedCount {
		t.Errorf("SLABreachedCount mismatch: got %d, want %d", decoded.SLABreachedCount, original.SLABreachedCount)
	}
	if decoded.MajorIncidents != original.MajorIncidents {
		t.Errorf("MajorIncidents mismatch: got %d, want %d", decoded.MajorIncidents, original.MajorIncidents)
	}
}

func TestSLAComplianceStatsJSON_RoundTrip(t *testing.T) {
	original := SLAComplianceStats{
		TotalTickets:  50,
		ResponseMet:   48,
		ResolutionMet: 45,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded SLAComplianceStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded != original {
		t.Errorf("SLAComplianceStats mismatch: got %+v, want %+v", decoded, original)
	}
}

func TestCSATStatsJSON_RoundTrip(t *testing.T) {
	original := CSATStats{
		Total:     100,
		AvgRating: 4.2,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded CSATStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.Total != original.Total {
		t.Errorf("Total mismatch: got %d, want %d", decoded.Total, original.Total)
	}
	if decoded.AvgRating != original.AvgRating {
		t.Errorf("AvgRating mismatch: got %f, want %f", decoded.AvgRating, original.AvgRating)
	}
}

func TestTicketCommentJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	ticketID := uuid.New()
	authorID := uuid.New()
	attachID := uuid.New()

	original := TicketComment{
		ID:          id,
		TicketID:    ticketID,
		AuthorID:    authorID,
		Content:     "Working on this issue now",
		IsInternal:  true,
		Attachments: []uuid.UUID{attachID},
		CreatedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded TicketComment
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Content != original.Content {
		t.Errorf("Content mismatch: got %q, want %q", decoded.Content, original.Content)
	}
	if decoded.IsInternal != original.IsInternal {
		t.Errorf("IsInternal mismatch")
	}
	if len(decoded.Attachments) != 1 {
		t.Errorf("Attachments length mismatch: got %d, want 1", len(decoded.Attachments))
	}
}

func TestTicketStatusHistoryJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	ticketID := uuid.New()
	changedBy := uuid.New()
	reason := "Customer confirmed fix"

	original := TicketStatusHistory{
		ID:         id,
		TicketID:   ticketID,
		FromStatus: TicketStatusInProgress,
		ToStatus:   TicketStatusResolved,
		ChangedBy:  changedBy,
		Reason:     &reason,
		CreatedAt:  now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded TicketStatusHistory
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.FromStatus != original.FromStatus {
		t.Errorf("FromStatus mismatch: got %q, want %q", decoded.FromStatus, original.FromStatus)
	}
	if decoded.ToStatus != original.ToStatus {
		t.Errorf("ToStatus mismatch: got %q, want %q", decoded.ToStatus, original.ToStatus)
	}
	if decoded.Reason == nil || *decoded.Reason != reason {
		t.Errorf("Reason mismatch")
	}
}

func TestSLABreachEntryJSON_RoundTrip(t *testing.T) {
	now := time.Now().Truncate(time.Millisecond).UTC()
	id := uuid.New()
	ticketID := uuid.New()
	duration := 5

	original := SLABreachEntry{
		ID:                    id,
		TicketID:              ticketID,
		BreachType:            SLABreachTypeResponse,
		BreachedAt:            now,
		TargetWas:             now.Add(-10 * time.Minute),
		ActualDurationMinutes: &duration,
		CreatedAt:             now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded SLABreachEntry
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.BreachType != original.BreachType {
		t.Errorf("BreachType mismatch: got %q, want %q", decoded.BreachType, original.BreachType)
	}
	if decoded.ActualDurationMinutes == nil || *decoded.ActualDurationMinutes != duration {
		t.Errorf("ActualDurationMinutes mismatch")
	}
}

// ──────────────────────────────────────────────
// validTicketTransitions completeness
// ──────────────────────────────────────────────

func TestValidTicketTransitions_AllStatusesCovered(t *testing.T) {
	allStatuses := []string{
		TicketStatusLogged,
		TicketStatusClassified,
		TicketStatusAssigned,
		TicketStatusInProgress,
		TicketStatusPendingCustomer,
		TicketStatusPendingVendor,
		TicketStatusResolved,
		TicketStatusClosed,
		TicketStatusCancelled,
	}

	for _, status := range allStatuses {
		if _, ok := validTicketTransitions[status]; !ok {
			t.Errorf("status %q is not present in validTicketTransitions map", status)
		}
	}
}

func TestTerminalStates_HaveNoTransitions(t *testing.T) {
	terminalStates := []string{TicketStatusClosed, TicketStatusCancelled}
	for _, status := range terminalStates {
		transitions := validTicketTransitions[status]
		if len(transitions) != 0 {
			t.Errorf("terminal status %q should have no transitions, got %v", status, transitions)
		}
	}
}

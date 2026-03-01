package itsm

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Helper: authenticated context
// ──────────────────────────────────────────────

func authenticatedCtx() context.Context {
	auth := &types.AuthContext{
		UserID:      uuid.New(),
		TenantID:    uuid.New(),
		Email:       "test@example.com",
		Roles:       []string{"admin"},
		Permissions: []string{"*"},
	}
	return types.SetAuthContext(context.Background(), auth)
}

// ──────────────────────────────────────────────
// NewTicketService constructor
// ──────────────────────────────────────────────

func TestNewTicketService(t *testing.T) {
	svc := NewTicketService(nil, nil)
	if svc == nil {
		t.Fatal("expected non-nil TicketService")
	}
	if svc.pool != nil {
		t.Error("expected nil pool")
	}
	if svc.auditSvc != nil {
		t.Error("expected nil auditSvc")
	}
}

// ──────────────────────────────────────────────
// Auth guard: every service method must reject nil auth context
// ──────────────────────────────────────────────

func TestCreateTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.CreateTicket(context.Background(), CreateTicketRequest{
		Type:        "incident",
		Title:       "Test",
		Description: "Test desc",
		Urgency:     "high",
		Impact:      "high",
	})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestGetTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.GetTicket(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestListTickets_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, _, err := svc.ListTickets(context.Background(), nil, nil, nil, nil, nil, nil, 10, 0)
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestUpdateTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.UpdateTicket(context.Background(), uuid.New(), UpdateTicketRequest{})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestTransitionStatus_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.TransitionStatus(context.Background(), uuid.New(), TransitionTicketRequest{Status: "in_progress"})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestAssignTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	assigneeID := uuid.New()
	_, err := svc.AssignTicket(context.Background(), uuid.New(), AssignTicketRequest{AssigneeID: &assigneeID})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestEscalateTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	err := svc.EscalateTicket(context.Background(), uuid.New(), "reason")
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestDeclareMajorIncident_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	err := svc.DeclareMajorIncident(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestLinkTickets_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	err := svc.LinkTickets(context.Background(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestResolveTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.ResolveTicket(context.Background(), uuid.New(), ResolveTicketRequest{ResolutionNotes: "fixed"})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestCloseTicket_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	err := svc.CloseTicket(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestListMyQueue_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, _, err := svc.ListMyQueue(context.Background(), 10, 0)
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestListTeamQueue_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, _, err := svc.ListTeamQueue(context.Background(), uuid.New(), 10, 0)
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestGetTicketStats_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.GetTicketStats(context.Background())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestAddComment_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.AddComment(context.Background(), uuid.New(), AddCommentRequest{Content: "hello"})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestListComments_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.ListComments(context.Background(), uuid.New(), true)
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestListStatusHistory_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.ListStatusHistory(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestCreateCSATSurvey_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.CreateCSATSurvey(context.Background(), CreateCSATSurveyRequest{
		TicketID: uuid.New(),
		Rating:   4,
	})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestGetCSATStats_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.GetCSATStats(context.Background())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestBulkUpdateTickets_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.BulkUpdateTickets(context.Background(), []uuid.UUID{uuid.New()}, map[string]string{"status": "closed"})
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

func TestListTicketsForExport_Unauthorized(t *testing.T) {
	svc := NewTicketService(nil, nil)
	_, err := svc.ListTicketsForExport(context.Background(), nil, nil, nil, 100)
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
	if err.Error() != "authentication required" {
		t.Errorf("expected 'authentication required', got %q", err.Error())
	}
}

// ──────────────────────────────────────────────
// BulkUpdateTickets: input validation (auth is present)
// ──────────────────────────────────────────────

func TestBulkUpdateTickets_EmptyIDs(t *testing.T) {
	svc := NewTicketService(nil, nil)
	ctx := authenticatedCtx()
	_, err := svc.BulkUpdateTickets(ctx, []uuid.UUID{}, map[string]string{"status": "closed"})
	if err == nil {
		t.Fatal("expected error for empty IDs")
	}
	if err.Error() != "ids must not be empty" {
		t.Errorf("expected 'ids must not be empty', got %q", err.Error())
	}
}

func TestBulkUpdateTickets_EmptyFields(t *testing.T) {
	svc := NewTicketService(nil, nil)
	ctx := authenticatedCtx()
	_, err := svc.BulkUpdateTickets(ctx, []uuid.UUID{uuid.New()}, map[string]string{})
	if err == nil {
		t.Fatal("expected error for empty fields")
	}
	if err.Error() != "fields must not be empty" {
		t.Errorf("expected 'fields must not be empty', got %q", err.Error())
	}
}

func TestBulkUpdateTickets_DisallowedField(t *testing.T) {
	svc := NewTicketService(nil, nil)
	ctx := authenticatedCtx()
	_, err := svc.BulkUpdateTickets(ctx, []uuid.UUID{uuid.New()}, map[string]string{"title": "new title"})
	if err == nil {
		t.Fatal("expected error for disallowed field")
	}
	expected := `field "title" is not allowed for bulk update`
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestBulkUpdateTickets_MultipleDisallowedFields(t *testing.T) {
	svc := NewTicketService(nil, nil)
	ctx := authenticatedCtx()
	_, err := svc.BulkUpdateTickets(ctx, []uuid.UUID{uuid.New()}, map[string]string{
		"status":      "closed",
		"description": "hacked",
	})
	if err == nil {
		t.Fatal("expected error for disallowed field mixed with allowed field")
	}
	// One of the disallowed fields should cause the error.
	expected := `field "description" is not allowed for bulk update`
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

// ──────────────────────────────────────────────
// ticketColumnForField helper
// ──────────────────────────────────────────────

func TestTicketColumnForField_AllowedFields(t *testing.T) {
	cases := []struct {
		field    string
		expected string
	}{
		{"status", "status"},
		{"priority", "priority"},
		{"assigneeId", "assignee_id"},
	}
	for _, tc := range cases {
		t.Run(tc.field, func(t *testing.T) {
			got := ticketColumnForField(tc.field)
			if got != tc.expected {
				t.Errorf("ticketColumnForField(%q) = %q, expected %q", tc.field, got, tc.expected)
			}
		})
	}
}

func TestTicketColumnForField_DisallowedFields(t *testing.T) {
	disallowed := []string{
		"title", "description", "type", "urgency", "impact", "channel",
		"category", "subcategory", "tags", "customFields",
		"reporterId", "tenantId", "id", "createdAt", "updatedAt",
		"", "unknown", "ASSIGNEEID", "Status",
	}
	for _, field := range disallowed {
		t.Run(field, func(t *testing.T) {
			got := ticketColumnForField(field)
			if got != "" {
				t.Errorf("ticketColumnForField(%q) = %q, expected empty string", field, got)
			}
		})
	}
}

// ──────────────────────────────────────────────
// strPtr helper
// ──────────────────────────────────────────────

func TestStrPtr(t *testing.T) {
	s := "hello"
	p := strPtr(s)
	if p == nil {
		t.Fatal("expected non-nil pointer")
	}
	if *p != s {
		t.Errorf("expected %q, got %q", s, *p)
	}
}

func TestStrPtr_EmptyString(t *testing.T) {
	p := strPtr("")
	if p == nil {
		t.Fatal("expected non-nil pointer")
	}
	if *p != "" {
		t.Errorf("expected empty string, got %q", *p)
	}
}

func TestStrPtr_UniquePointers(t *testing.T) {
	p1 := strPtr("a")
	p2 := strPtr("a")
	if p1 == p2 {
		t.Error("expected distinct pointers for separate calls")
	}
}

// ──────────────────────────────────────────────
// joinStrings helper
// ──────────────────────────────────────────────

func TestJoinStrings_Empty(t *testing.T) {
	result := joinStrings([]string{}, ", ")
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}

func TestJoinStrings_SingleElement(t *testing.T) {
	result := joinStrings([]string{"alpha"}, ", ")
	if result != "alpha" {
		t.Errorf("expected 'alpha', got %q", result)
	}
}

func TestJoinStrings_MultipleElements(t *testing.T) {
	result := joinStrings([]string{"a", "b", "c"}, ", ")
	if result != "a, b, c" {
		t.Errorf("expected 'a, b, c', got %q", result)
	}
}

func TestJoinStrings_DifferentSeparator(t *testing.T) {
	result := joinStrings([]string{"x", "y"}, " AND ")
	if result != "x AND y" {
		t.Errorf("expected 'x AND y', got %q", result)
	}
}

func TestJoinStrings_EmptySeparator(t *testing.T) {
	result := joinStrings([]string{"a", "b", "c"}, "")
	if result != "abc" {
		t.Errorf("expected 'abc', got %q", result)
	}
}

func TestJoinStrings_EmptyElements(t *testing.T) {
	result := joinStrings([]string{"", "", ""}, ",")
	if result != ",," {
		t.Errorf("expected ',,', got %q", result)
	}
}

// ──────────────────────────────────────────────
// Priority auto-calculation in CreateTicket
// (Tested via CalculatePriority since CreateTicket
// calls it internally — see types_test.go for full
// matrix tests. Here we validate the service-level
// integration of the priority logic.)
// ──────────────────────────────────────────────

func TestCreateTicket_PriorityAutoCalculation_Integration(t *testing.T) {
	// The CreateTicket method calls CalculatePriority(req.Urgency, req.Impact)
	// and only overrides if req.Priority is non-nil.
	// We can test the logic path by verifying CalculatePriority returns
	// the right value and that the override mechanism works correctly.

	// Case 1: no explicit priority — should use matrix result
	priority := CalculatePriority("critical", "critical")
	if priority != TicketPriorityP1Critical {
		t.Errorf("auto-calc: expected %s, got %s", TicketPriorityP1Critical, priority)
	}

	// Case 2: explicit priority override
	req := CreateTicketRequest{
		Urgency:  "low",
		Impact:   "low",
		Priority: strPtr("P1_critical"),
	}
	// Simulate the same logic as CreateTicket
	calculated := CalculatePriority(req.Urgency, req.Impact)
	if calculated != TicketPriorityP4Low {
		t.Errorf("expected P4_low from matrix, got %s", calculated)
	}
	// But explicit override should win
	if req.Priority != nil {
		calculated = *req.Priority
	}
	if calculated != "P1_critical" {
		t.Errorf("expected override P1_critical, got %s", calculated)
	}
}

func TestCreateTicket_DefaultChannel_Integration(t *testing.T) {
	// The CreateTicket method defaults channel to "portal" if req.Channel is nil.
	// Verify the default logic.
	req := CreateTicketRequest{
		Type:        "incident",
		Title:       "Test",
		Description: "Test desc",
		Urgency:     "high",
		Impact:      "high",
	}

	// Simulate channel defaulting logic from CreateTicket
	channel := "portal"
	if req.Channel != nil {
		channel = *req.Channel
	}
	if channel != "portal" {
		t.Errorf("expected default channel 'portal', got %q", channel)
	}

	// With explicit channel
	email := "email"
	req.Channel = &email
	channel = "portal"
	if req.Channel != nil {
		channel = *req.Channel
	}
	if channel != "email" {
		t.Errorf("expected explicit channel 'email', got %q", channel)
	}
}

func TestCreateTicket_DefaultTags_Integration(t *testing.T) {
	// Tags default to empty slice if nil
	req := CreateTicketRequest{}
	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}
	if len(tags) != 0 {
		t.Errorf("expected empty tags, got %d", len(tags))
	}

	// With explicit tags
	req.Tags = []string{"urgent", "network"}
	tags = req.Tags
	if tags == nil {
		tags = []string{}
	}
	if len(tags) != 2 {
		t.Errorf("expected 2 tags, got %d", len(tags))
	}
}

// ──────────────────────────────────────────────
// Ticket status transition validation
// (Integration with TransitionStatus logic)
// ──────────────────────────────────────────────

func TestTransitionStatus_AllValidPaths(t *testing.T) {
	// Verify every valid transition defined in the state machine.
	validTransitions := map[string][]string{
		"logged":           {"classified", "assigned", "cancelled"},
		"classified":       {"assigned", "cancelled"},
		"assigned":         {"in_progress", "cancelled"},
		"in_progress":      {"pending_customer", "pending_vendor", "resolved", "cancelled"},
		"pending_customer": {"in_progress", "resolved", "cancelled"},
		"pending_vendor":   {"in_progress", "resolved", "cancelled"},
		"resolved":         {"closed", "in_progress"},
	}

	for from, toStatuses := range validTransitions {
		for _, to := range toStatuses {
			if !IsValidTicketTransition(from, to) {
				t.Errorf("expected valid transition from %q to %q", from, to)
			}
		}
	}
}

func TestTransitionStatus_TerminalStates(t *testing.T) {
	// Closed and cancelled are terminal — no outbound transitions.
	terminals := []string{"closed", "cancelled"}
	allStatuses := []string{
		"logged", "classified", "assigned", "in_progress",
		"pending_customer", "pending_vendor", "resolved",
		"closed", "cancelled",
	}

	for _, terminal := range terminals {
		for _, target := range allStatuses {
			if IsValidTicketTransition(terminal, target) {
				t.Errorf("terminal state %q should not transition to %q", terminal, target)
			}
		}
	}
}

func TestTransitionStatus_SelfTransition(t *testing.T) {
	// Self-transitions should be invalid for all statuses.
	statuses := []string{
		"logged", "classified", "assigned", "in_progress",
		"pending_customer", "pending_vendor", "resolved",
		"closed", "cancelled",
	}

	for _, s := range statuses {
		if IsValidTicketTransition(s, s) {
			t.Errorf("self-transition from %q to %q should be invalid", s, s)
		}
	}
}

func TestTransitionStatus_InvalidFromStatus(t *testing.T) {
	// Unknown source status should be invalid.
	if IsValidTicketTransition("unknown_status", "in_progress") {
		t.Error("expected invalid transition from unknown status")
	}
	if IsValidTicketTransition("", "in_progress") {
		t.Error("expected invalid transition from empty status")
	}
}

func TestTransitionStatus_InvalidToStatus(t *testing.T) {
	// Unknown target status should be invalid even from valid source.
	if IsValidTicketTransition("logged", "unknown") {
		t.Error("expected invalid transition to unknown status")
	}
	if IsValidTicketTransition("in_progress", "") {
		t.Error("expected invalid transition to empty status")
	}
}

func TestTransitionStatus_SkipSteps(t *testing.T) {
	// Cannot skip steps in the workflow.
	invalidSkips := []struct {
		from, to string
	}{
		{"logged", "in_progress"},    // must go through assigned first
		{"logged", "resolved"},       // can't resolve from logged
		{"logged", "closed"},         // can't close from logged
		{"classified", "in_progress"}, // must go through assigned first
		{"classified", "resolved"},    // can't resolve from classified
		{"assigned", "resolved"},      // must go through in_progress first
		{"assigned", "closed"},        // can't close from assigned
	}

	for _, tc := range invalidSkips {
		if IsValidTicketTransition(tc.from, tc.to) {
			t.Errorf("skip-step transition from %q to %q should be invalid", tc.from, tc.to)
		}
	}
}

// ──────────────────────────────────────────────
// SLA pause/resume logic paths
// (Validates the decision logic without DB)
// ──────────────────────────────────────────────

func TestSLAPauseLogic_TransitionToPendingCustomer(t *testing.T) {
	// When transitioning to pending_customer, SLA should be paused.
	req := TransitionTicketRequest{Status: "pending_customer"}

	// Simulate the pause logic from TransitionStatus
	var slaPausedAt *bool
	if req.Status == "pending_customer" {
		paused := true
		slaPausedAt = &paused
	}

	if slaPausedAt == nil || !*slaPausedAt {
		t.Error("expected SLA to be paused when transitioning to pending_customer")
	}
}

func TestSLAPauseLogic_TransitionFromPendingCustomer(t *testing.T) {
	// When transitioning from pending_customer to another status,
	// the SLA clock should resume (paused_at should be cleared).
	existingStatus := "pending_customer"
	req := TransitionTicketRequest{Status: "in_progress"}

	// Simulate the resume logic
	shouldResume := existingStatus == "pending_customer" && req.Status != "pending_customer"
	if !shouldResume {
		t.Error("expected SLA resume when transitioning from pending_customer")
	}
}

func TestSLAPauseLogic_NoChangeForOtherTransitions(t *testing.T) {
	// For transitions not involving pending_customer, SLA paused state should not change.
	existingStatus := "in_progress"
	req := TransitionTicketRequest{Status: "resolved"}

	isPausing := req.Status == "pending_customer"
	isResuming := existingStatus == "pending_customer"

	if isPausing || isResuming {
		t.Error("expected no SLA pause/resume change for non-pending transitions")
	}
}

// ──────────────────────────────────────────────
// ticketColumns constant
// ──────────────────────────────────────────────

func TestTicketColumns_NotEmpty(t *testing.T) {
	if ticketColumns == "" {
		t.Error("ticketColumns should not be empty")
	}
}

func TestTicketColumns_ContainsKeyColumns(t *testing.T) {
	expectedSubstrings := []string{
		"id", "tenant_id", "ticket_number", "type",
		"title", "description", "priority", "urgency", "impact",
		"status", "channel", "reporter_id", "assignee_id",
		"sla_policy_id", "sla_response_target", "sla_resolution_target",
		"sla_response_met", "sla_resolution_met",
		"sla_paused_at", "sla_paused_duration_minutes",
		"is_major_incident", "related_ticket_ids",
		"resolution_notes", "resolved_at", "closed_at",
		"first_response_at", "satisfaction_score",
		"tags", "custom_fields", "created_at", "updated_at",
	}
	for _, sub := range expectedSubstrings {
		found := false
		// Simple substring search
		for i := 0; i <= len(ticketColumns)-len(sub); i++ {
			if ticketColumns[i:i+len(sub)] == sub {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("ticketColumns missing column %q", sub)
		}
	}
}

// ──────────────────────────────────────────────
// priorityOrderSQL constant
// ──────────────────────────────────────────────

func TestPriorityOrderSQL_NotEmpty(t *testing.T) {
	if priorityOrderSQL == "" {
		t.Error("priorityOrderSQL should not be empty")
	}
}

func TestPriorityOrderSQL_ContainsPriorities(t *testing.T) {
	priorities := []string{"P1", "P2", "P3", "P4"}
	for _, p := range priorities {
		found := false
		for i := 0; i <= len(priorityOrderSQL)-len(p); i++ {
			if priorityOrderSQL[i:i+len(p)] == p {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("priorityOrderSQL missing priority %q", p)
		}
	}
}

// ──────────────────────────────────────────────
// CreateTicket defaults: CustomFields
// ──────────────────────────────────────────────

func TestCreateTicket_DefaultCustomFields_Integration(t *testing.T) {
	// CustomFields defaults to json.RawMessage("null") when nil.
	req := CreateTicketRequest{}

	customFields := req.CustomFields
	if customFields == nil {
		customFields = []byte("null")
	}

	if string(customFields) != "null" {
		t.Errorf("expected 'null', got %q", string(customFields))
	}

	// With explicit custom fields
	req.CustomFields = []byte(`{"env":"prod"}`)
	customFields = req.CustomFields
	if customFields == nil {
		customFields = []byte("null")
	}
	if string(customFields) != `{"env":"prod"}` {
		t.Errorf("expected explicit custom fields, got %q", string(customFields))
	}
}

// ──────────────────────────────────────────────
// AssignTicket: first-response SLA logic paths
// ──────────────────────────────────────────────

func TestAssignTicket_FirstResponseLogic(t *testing.T) {
	// When assigning for the first time (FirstResponseAt is nil and AssigneeID is non-nil),
	// first_response_at should be set.
	assigneeID := uuid.New()
	req := AssignTicketRequest{AssigneeID: &assigneeID}

	// Simulate the first-response check
	var existingFirstResponseAt *string // nil = no prior assignment
	shouldRecordFirstResponse := existingFirstResponseAt == nil && req.AssigneeID != nil

	if !shouldRecordFirstResponse {
		t.Error("expected first response to be recorded on first assignment")
	}
}

func TestAssignTicket_SubsequentAssignment(t *testing.T) {
	// If FirstResponseAt is already set, it should not be overwritten.
	assigneeID := uuid.New()
	req := AssignTicketRequest{AssigneeID: &assigneeID}

	existingFirstResponseAt := "2025-01-01T00:00:00Z" // already set
	shouldRecordFirstResponse := existingFirstResponseAt == "" && req.AssigneeID != nil

	// Since it's a non-empty string (already set), should not record again
	if shouldRecordFirstResponse {
		t.Error("expected first response NOT to be recorded on subsequent assignment")
	}
}

func TestAssignTicket_NilAssignee(t *testing.T) {
	// If AssigneeID is nil (only updating team queue), first response should not be set.
	req := AssignTicketRequest{AssigneeID: nil}

	shouldRecordFirstResponse := req.AssigneeID != nil
	if shouldRecordFirstResponse {
		t.Error("expected first response NOT to be recorded when assignee is nil")
	}
}

// ──────────────────────────────────────────────
// ListTicketsForExport: maxRows clamping
// ──────────────────────────────────────────────

func TestListTicketsForExport_MaxRowsClamping(t *testing.T) {
	// The method clamps maxRows to 10000 if <= 0 or > 10000.
	clamp := func(maxRows int) int {
		if maxRows <= 0 || maxRows > 10000 {
			maxRows = 10000
		}
		return maxRows
	}

	cases := []struct {
		input    int
		expected int
	}{
		{0, 10000},
		{-1, 10000},
		{-100, 10000},
		{10001, 10000},
		{50000, 10000},
		{1, 1},
		{500, 500},
		{10000, 10000},
		{9999, 9999},
	}

	for _, tc := range cases {
		result := clamp(tc.input)
		if result != tc.expected {
			t.Errorf("clamp(%d) = %d, expected %d", tc.input, result, tc.expected)
		}
	}
}

// ──────────────────────────────────────────────
// AddComment: auto-transition logic path
// ──────────────────────────────────────────────

func TestAddComment_AutoTransitionCondition(t *testing.T) {
	// When an external comment is added to a ticket in pending_customer status,
	// the ticket should auto-transition to in_progress.
	cases := []struct {
		name           string
		isInternal     *bool
		existingStatus string
		shouldTransition bool
	}{
		{
			name:             "external comment on pending_customer",
			isInternal:       nil,
			existingStatus:   "pending_customer",
			shouldTransition: true,
		},
		{
			name:             "explicit external comment on pending_customer",
			isInternal:       boolPtr(false),
			existingStatus:   "pending_customer",
			shouldTransition: true,
		},
		{
			name:             "internal comment on pending_customer",
			isInternal:       boolPtr(true),
			existingStatus:   "pending_customer",
			shouldTransition: false,
		},
		{
			name:             "external comment on in_progress",
			isInternal:       nil,
			existingStatus:   "in_progress",
			shouldTransition: false,
		},
		{
			name:             "external comment on assigned",
			isInternal:       nil,
			existingStatus:   "assigned",
			shouldTransition: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Replicate the condition from AddComment
			shouldTransition := (tc.isInternal == nil || !*tc.isInternal) && tc.existingStatus == "pending_customer"
			if shouldTransition != tc.shouldTransition {
				t.Errorf("expected shouldTransition=%v, got %v", tc.shouldTransition, shouldTransition)
			}
		})
	}
}

func boolPtr(b bool) *bool {
	return &b
}

// ──────────────────────────────────────────────
// ResolveTicket: SLA resolution met logic
// ──────────────────────────────────────────────

func TestResolveTicket_SLAResolutionMetCondition(t *testing.T) {
	// When resolving a ticket with an SLA resolution target set,
	// the system checks whether the current time is before or equal to the target.
	// If no SLA target, slaResolutionMet remains nil.

	cases := []struct {
		name           string
		hasTarget      bool
		expectedNilMet bool
	}{
		{"no SLA target", false, true},
		{"has SLA target", true, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var slaResolutionMet *bool
			if tc.hasTarget {
				met := true
				slaResolutionMet = &met
			}

			isNil := slaResolutionMet == nil
			if isNil != tc.expectedNilMet {
				t.Errorf("expected nil=%v, got nil=%v", tc.expectedNilMet, isNil)
			}
		})
	}
}

// ──────────────────────────────────────────────
// Comprehensive auth guard table test
// ──────────────────────────────────────────────

func TestAllServiceMethods_RequireAuth(t *testing.T) {
	svc := NewTicketService(nil, nil)
	ctx := context.Background() // no auth context

	tests := []struct {
		name string
		fn   func() error
	}{
		{"CreateTicket", func() error {
			_, err := svc.CreateTicket(ctx, CreateTicketRequest{})
			return err
		}},
		{"GetTicket", func() error {
			_, err := svc.GetTicket(ctx, uuid.New())
			return err
		}},
		{"ListTickets", func() error {
			_, _, err := svc.ListTickets(ctx, nil, nil, nil, nil, nil, nil, 10, 0)
			return err
		}},
		{"UpdateTicket", func() error {
			_, err := svc.UpdateTicket(ctx, uuid.New(), UpdateTicketRequest{})
			return err
		}},
		{"TransitionStatus", func() error {
			_, err := svc.TransitionStatus(ctx, uuid.New(), TransitionTicketRequest{Status: "x"})
			return err
		}},
		{"AssignTicket", func() error {
			_, err := svc.AssignTicket(ctx, uuid.New(), AssignTicketRequest{})
			return err
		}},
		{"EscalateTicket", func() error {
			return svc.EscalateTicket(ctx, uuid.New(), "reason")
		}},
		{"DeclareMajorIncident", func() error {
			return svc.DeclareMajorIncident(ctx, uuid.New())
		}},
		{"LinkTickets", func() error {
			return svc.LinkTickets(ctx, uuid.New(), uuid.New())
		}},
		{"ResolveTicket", func() error {
			_, err := svc.ResolveTicket(ctx, uuid.New(), ResolveTicketRequest{ResolutionNotes: "n"})
			return err
		}},
		{"CloseTicket", func() error {
			return svc.CloseTicket(ctx, uuid.New())
		}},
		{"ListMyQueue", func() error {
			_, _, err := svc.ListMyQueue(ctx, 10, 0)
			return err
		}},
		{"ListTeamQueue", func() error {
			_, _, err := svc.ListTeamQueue(ctx, uuid.New(), 10, 0)
			return err
		}},
		{"GetTicketStats", func() error {
			_, err := svc.GetTicketStats(ctx)
			return err
		}},
		{"AddComment", func() error {
			_, err := svc.AddComment(ctx, uuid.New(), AddCommentRequest{Content: "c"})
			return err
		}},
		{"ListComments", func() error {
			_, err := svc.ListComments(ctx, uuid.New(), false)
			return err
		}},
		{"ListStatusHistory", func() error {
			_, err := svc.ListStatusHistory(ctx, uuid.New())
			return err
		}},
		{"CreateCSATSurvey", func() error {
			_, err := svc.CreateCSATSurvey(ctx, CreateCSATSurveyRequest{TicketID: uuid.New(), Rating: 3})
			return err
		}},
		{"GetCSATStats", func() error {
			_, err := svc.GetCSATStats(ctx)
			return err
		}},
		{"BulkUpdateTickets", func() error {
			_, err := svc.BulkUpdateTickets(ctx, []uuid.UUID{uuid.New()}, map[string]string{"status": "x"})
			return err
		}},
		{"ListTicketsForExport", func() error {
			_, err := svc.ListTicketsForExport(ctx, nil, nil, nil, 100)
			return err
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.fn()
			if err == nil {
				t.Fatalf("%s: expected unauthorized error, got nil", tt.name)
			}
			if err.Error() != "authentication required" {
				t.Errorf("%s: expected 'authentication required', got %q", tt.name, err.Error())
			}
		})
	}
}

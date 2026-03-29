package automation

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Trigger type constants
// ──────────────────────────────────────────────

func TestTriggerTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Event", TriggerTypeEvent, "event"},
		{"Schedule", TriggerTypeSchedule, "schedule"},
		{"Condition", TriggerTypeCondition, "condition"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidTriggerTypes(t *testing.T) {
	expected := []string{"event", "schedule", "condition"}
	for _, v := range expected {
		if !ValidTriggerTypes[v] {
			t.Errorf("expected %q to be a valid trigger type", v)
		}
	}

	if ValidTriggerTypes["invalid"] {
		t.Errorf("expected 'invalid' to not be a valid trigger type")
	}

	if len(ValidTriggerTypes) != len(expected) {
		t.Errorf("expected %d trigger types, got %d", len(expected), len(ValidTriggerTypes))
	}
}

// ──────────────────────────────────────────────
// Action type constants
// ──────────────────────────────────────────────

func TestActionTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"UpdateField", ActionTypeUpdateField, "update_field"},
		{"AssignQueue", ActionTypeAssignQueue, "assign_queue"},
		{"AssignUser", ActionTypeAssignUser, "assign_user"},
		{"SendNotification", ActionTypeSendNotification, "send_notification"},
		{"StartApproval", ActionTypeStartApproval, "start_approval"},
		{"CreateActionItem", ActionTypeCreateActionItem, "create_action_item"},
		{"Webhook", ActionTypeWebhook, "webhook"},
		{"Escalate", ActionTypeEscalate, "escalate"},
		{"SetPriority", ActionTypeSetPriority, "set_priority"},
		{"AddTag", ActionTypeAddTag, "add_tag"},
		{"AddComment", ActionTypeAddComment, "add_comment"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidActionTypes(t *testing.T) {
	expected := []string{
		"update_field", "assign_queue", "assign_user", "send_notification",
		"start_approval", "create_action_item", "webhook", "escalate",
		"set_priority", "add_tag", "add_comment",
	}
	for _, v := range expected {
		if !ValidActionTypes[v] {
			t.Errorf("expected %q to be a valid action type", v)
		}
	}

	if ValidActionTypes["invalid_action"] {
		t.Errorf("expected 'invalid_action' to not be a valid action type")
	}

	if len(ValidActionTypes) != len(expected) {
		t.Errorf("expected %d action types, got %d", len(expected), len(ValidActionTypes))
	}
}

// ──────────────────────────────────────────────
// Operator constants
// ──────────────────────────────────────────────

func TestOperatorConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Eq", OperatorEq, "eq"},
		{"Neq", OperatorNeq, "neq"},
		{"Gt", OperatorGt, "gt"},
		{"Lt", OperatorLt, "lt"},
		{"Contains", OperatorContains, "contains"},
		{"IsNull", OperatorIsNull, "is_null"},
		{"IsNotNull", OperatorIsNotNull, "is_not_null"},
		{"In", OperatorIn, "in"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.got)
			}
		})
	}
}

func TestValidOperators(t *testing.T) {
	expected := []string{"eq", "neq", "gt", "lt", "contains", "is_null", "is_not_null", "in"}
	for _, v := range expected {
		if !ValidOperators[v] {
			t.Errorf("expected %q to be a valid operator", v)
		}
	}

	if ValidOperators["invalid_op"] {
		t.Errorf("expected 'invalid_op' to not be a valid operator")
	}

	if len(ValidOperators) != len(expected) {
		t.Errorf("expected %d operators, got %d", len(expected), len(ValidOperators))
	}
}

// ──────────────────────────────────────────────
// Execution status constants
// ──────────────────────────────────────────────

func TestExecutionStatusConstants(t *testing.T) {
	tests := []struct {
		name     string
		got      string
		expected string
	}{
		{"Success", ExecutionStatusSuccess, "success"},
		{"Partial", ExecutionStatusPartial, "partial"},
		{"Failed", ExecutionStatusFailed, "failed"},
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
// Entity type mapping
// ──────────────────────────────────────────────

func TestValidEntityTypes(t *testing.T) {
	tests := []struct {
		key      string
		expected string
	}{
		{"ticket", "tickets"},
		{"project", "projects"},
		{"work_item", "work_items"},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			got, ok := ValidEntityTypes[tt.key]
			if !ok {
				t.Errorf("expected %q to be a valid entity type", tt.key)
			}
			if got != tt.expected {
				t.Errorf("expected table %q for entity type %q, got %q", tt.expected, tt.key, got)
			}
		})
	}

	if _, ok := ValidEntityTypes["invalid"]; ok {
		t.Errorf("expected 'invalid' to not be a valid entity type")
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestAutomationRuleJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	desc := "Assigns new tickets to the support queue"
	original := AutomationRule{
		ID:                   uuid.New(),
		TenantID:             uuid.New(),
		Name:                 "Auto-assign tickets",
		Description:          &desc,
		IsActive:             true,
		TriggerType:          TriggerTypeEvent,
		TriggerConfig:        json.RawMessage(`{"event_type":"ticket.created"}`),
		ConditionConfig:      json.RawMessage(`{"logic":"and","conditions":[]}`),
		Actions:              json.RawMessage(`[{"type":"assign_queue","config":{"queue":"support"}}]`),
		MaxExecutionsPerHour: 100,
		CooldownMinutes:      5,
		ExecutionCount:       42,
		CreatedBy:            uuid.New(),
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AutomationRule: %v", err)
	}

	var decoded AutomationRule
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AutomationRule: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.Name != original.Name {
		t.Errorf("Name mismatch: expected %q, got %q", original.Name, decoded.Name)
	}
	if decoded.IsActive != true {
		t.Errorf("IsActive mismatch: expected true, got false")
	}
	if decoded.TriggerType != original.TriggerType {
		t.Errorf("TriggerType mismatch: expected %q, got %q", original.TriggerType, decoded.TriggerType)
	}
	if decoded.MaxExecutionsPerHour != 100 {
		t.Errorf("MaxExecutionsPerHour mismatch: expected 100, got %d", decoded.MaxExecutionsPerHour)
	}
	if decoded.CooldownMinutes != 5 {
		t.Errorf("CooldownMinutes mismatch: expected 5, got %d", decoded.CooldownMinutes)
	}
	if decoded.ExecutionCount != 42 {
		t.Errorf("ExecutionCount mismatch: expected 42, got %d", decoded.ExecutionCount)
	}
}

func TestAutomationExecutionJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	errMsg := "timeout"
	original := AutomationExecution{
		ID:           uuid.New(),
		RuleID:       uuid.New(),
		TenantID:     uuid.New(),
		TriggerEvent: json.RawMessage(`{"type":"ticket.created"}`),
		EntityType:   "ticket",
		EntityID:     uuid.New(),
		ActionsTaken: json.RawMessage(`[{"type":"assign_queue"}]`),
		Status:       ExecutionStatusFailed,
		ErrorMessage: &errMsg,
		DurationMs:   150,
		ExecutedAt:   now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AutomationExecution: %v", err)
	}

	var decoded AutomationExecution
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AutomationExecution: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.RuleID != original.RuleID {
		t.Errorf("RuleID mismatch")
	}
	if decoded.Status != ExecutionStatusFailed {
		t.Errorf("Status mismatch: expected %q, got %q", ExecutionStatusFailed, decoded.Status)
	}
	if decoded.ErrorMessage == nil || *decoded.ErrorMessage != errMsg {
		t.Errorf("ErrorMessage mismatch")
	}
	if decoded.DurationMs != 150 {
		t.Errorf("DurationMs mismatch: expected 150, got %d", decoded.DurationMs)
	}
}

func TestAutomationStatsJSONRoundTrip(t *testing.T) {
	original := AutomationStats{
		TotalRules:      10,
		ActiveRules:     7,
		ExecutionsToday: 42,
		FailuresToday:   3,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal AutomationStats: %v", err)
	}

	var decoded AutomationStats
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal AutomationStats: %v", err)
	}

	if decoded.TotalRules != 10 {
		t.Errorf("TotalRules mismatch: expected 10, got %d", decoded.TotalRules)
	}
	if decoded.ActiveRules != 7 {
		t.Errorf("ActiveRules mismatch: expected 7, got %d", decoded.ActiveRules)
	}
	if decoded.ExecutionsToday != 42 {
		t.Errorf("ExecutionsToday mismatch: expected 42, got %d", decoded.ExecutionsToday)
	}
	if decoded.FailuresToday != 3 {
		t.Errorf("FailuresToday mismatch: expected 3, got %d", decoded.FailuresToday)
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateAutomationRuleRequestJSON(t *testing.T) {
	body := `{
		"name": "Auto-close stale tickets",
		"description": "Closes tickets older than 30 days",
		"triggerType": "schedule",
		"triggerConfig": {"cron": "0 */15 * * *"},
		"conditionConfig": {"logic": "and", "conditions": []},
		"actions": [{"type": "update_field", "config": {"field": "status", "value": "closed"}}],
		"maxExecutionsPerHour": 50,
		"cooldownMinutes": 10
	}`

	var req CreateAutomationRuleRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateAutomationRuleRequest: %v", err)
	}

	if req.Name != "Auto-close stale tickets" {
		t.Errorf("Name mismatch")
	}
	if req.TriggerType != "schedule" {
		t.Errorf("TriggerType mismatch: expected %q, got %q", "schedule", req.TriggerType)
	}
	if req.MaxExecutionsPerHour != 50 {
		t.Errorf("MaxExecutionsPerHour mismatch: expected 50, got %d", req.MaxExecutionsPerHour)
	}
	if req.CooldownMinutes != 10 {
		t.Errorf("CooldownMinutes mismatch: expected 10, got %d", req.CooldownMinutes)
	}
}

func TestTestRuleRequestJSON(t *testing.T) {
	body := `{
		"entityType": "ticket",
		"entityId": "11111111-1111-1111-1111-111111111111"
	}`

	var req TestRuleRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal TestRuleRequest: %v", err)
	}

	if req.EntityType != "ticket" {
		t.Errorf("EntityType mismatch: expected %q, got %q", "ticket", req.EntityType)
	}
	if req.EntityID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("EntityID mismatch")
	}
}

func TestConditionJSONRoundTrip(t *testing.T) {
	body := `{"field": "status", "operator": "eq", "value": "open"}`

	var c Condition
	if err := json.Unmarshal([]byte(body), &c); err != nil {
		t.Fatalf("failed to unmarshal Condition: %v", err)
	}

	if c.Field != "status" {
		t.Errorf("Field mismatch")
	}
	if c.Operator != "eq" {
		t.Errorf("Operator mismatch")
	}
}

func TestActionConfigJSONRoundTrip(t *testing.T) {
	body := `{"type": "update_field", "config": {"field": "priority", "value": "high"}}`

	var ac ActionConfig
	if err := json.Unmarshal([]byte(body), &ac); err != nil {
		t.Fatalf("failed to unmarshal ActionConfig: %v", err)
	}

	if ac.Type != "update_field" {
		t.Errorf("Type mismatch: expected %q, got %q", "update_field", ac.Type)
	}
	if ac.Config["field"] != "priority" {
		t.Errorf("Config field mismatch")
	}
}

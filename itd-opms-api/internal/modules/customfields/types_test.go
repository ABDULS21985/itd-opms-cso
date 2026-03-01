package customfields

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Valid entity types
// ──────────────────────────────────────────────

func TestValidEntityTypes(t *testing.T) {
	tests := []struct {
		key      string
		expected string
	}{
		{"ticket", "tickets"},
		{"project", "projects"},
		{"work_item", "work_items"},
		{"asset", "assets"},
		{"vendor", "vendors"},
		{"contract", "contracts"},
		{"risk", "risks"},
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

	if len(ValidEntityTypes) != len(tests) {
		t.Errorf("expected %d entity types, got %d", len(tests), len(ValidEntityTypes))
	}
}

// ──────────────────────────────────────────────
// Valid field types
// ──────────────────────────────────────────────

func TestValidFieldTypes(t *testing.T) {
	expected := []string{
		"text", "textarea", "number", "decimal", "boolean",
		"date", "datetime", "select", "multiselect",
		"url", "email", "phone", "user_reference",
	}

	for _, v := range expected {
		if !ValidFieldTypes[v] {
			t.Errorf("expected %q to be a valid field type", v)
		}
	}

	if ValidFieldTypes["invalid_type"] {
		t.Errorf("expected 'invalid_type' to not be a valid field type")
	}

	if len(ValidFieldTypes) != len(expected) {
		t.Errorf("expected %d field types, got %d", len(expected), len(ValidFieldTypes))
	}
}

// ──────────────────────────────────────────────
// JSON round-trip tests
// ──────────────────────────────────────────────

func TestCustomFieldDefinitionJSONRoundTrip(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	defVal := "default_value"
	original := CustomFieldDefinition{
		ID:              uuid.New(),
		TenantID:        uuid.New(),
		EntityType:      "ticket",
		FieldKey:        "cf_region",
		FieldLabel:      "Region",
		FieldType:       "select",
		Description:     "User's region",
		IsRequired:      true,
		IsFilterable:    true,
		IsVisibleInList: true,
		DisplayOrder:    1,
		ValidationRules: json.RawMessage(`{"options":["APAC","EMEA","AMER"]}`),
		DefaultValue:    &defVal,
		IsActive:        true,
		CreatedBy:       uuid.New(),
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("failed to marshal CustomFieldDefinition: %v", err)
	}

	var decoded CustomFieldDefinition
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal CustomFieldDefinition: %v", err)
	}

	if decoded.ID != original.ID {
		t.Errorf("ID mismatch")
	}
	if decoded.EntityType != "ticket" {
		t.Errorf("EntityType mismatch: expected %q, got %q", "ticket", decoded.EntityType)
	}
	if decoded.FieldKey != "cf_region" {
		t.Errorf("FieldKey mismatch")
	}
	if decoded.FieldLabel != "Region" {
		t.Errorf("FieldLabel mismatch")
	}
	if decoded.FieldType != "select" {
		t.Errorf("FieldType mismatch")
	}
	if !decoded.IsRequired {
		t.Errorf("IsRequired mismatch: expected true")
	}
	if !decoded.IsFilterable {
		t.Errorf("IsFilterable mismatch: expected true")
	}
	if !decoded.IsVisibleInList {
		t.Errorf("IsVisibleInList mismatch: expected true")
	}
	if decoded.DisplayOrder != 1 {
		t.Errorf("DisplayOrder mismatch: expected 1, got %d", decoded.DisplayOrder)
	}
	if decoded.DefaultValue == nil || *decoded.DefaultValue != defVal {
		t.Errorf("DefaultValue mismatch")
	}
	if !decoded.IsActive {
		t.Errorf("IsActive mismatch: expected true")
	}
}

// ──────────────────────────────────────────────
// Request type JSON decoding
// ──────────────────────────────────────────────

func TestCreateCustomFieldDefinitionRequestJSON(t *testing.T) {
	body := `{
		"entityType": "ticket",
		"fieldKey": "cf_department",
		"fieldLabel": "Department",
		"fieldType": "select",
		"description": "User department",
		"isRequired": true,
		"isFilterable": true,
		"isVisibleInList": false,
		"displayOrder": 5,
		"validationRules": {"options": ["IT", "HR", "Finance"]}
	}`

	var req CreateCustomFieldDefinitionRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal CreateCustomFieldDefinitionRequest: %v", err)
	}

	if req.EntityType != "ticket" {
		t.Errorf("EntityType mismatch")
	}
	if req.FieldKey != "cf_department" {
		t.Errorf("FieldKey mismatch")
	}
	if req.FieldLabel != "Department" {
		t.Errorf("FieldLabel mismatch")
	}
	if req.FieldType != "select" {
		t.Errorf("FieldType mismatch")
	}
	if !req.IsRequired {
		t.Errorf("IsRequired expected true")
	}
	if !req.IsFilterable {
		t.Errorf("IsFilterable expected true")
	}
	if req.IsVisibleInList {
		t.Errorf("IsVisibleInList expected false")
	}
	if req.DisplayOrder != 5 {
		t.Errorf("DisplayOrder mismatch")
	}
}

func TestReorderRequestJSON(t *testing.T) {
	body := `{
		"items": [
			{"id": "11111111-1111-1111-1111-111111111111", "displayOrder": 1},
			{"id": "22222222-2222-2222-2222-222222222222", "displayOrder": 2}
		]
	}`

	var req ReorderRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal ReorderRequest: %v", err)
	}

	if len(req.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(req.Items))
	}
	if req.Items[0].ID.String() != "11111111-1111-1111-1111-111111111111" {
		t.Errorf("Items[0].ID mismatch")
	}
	if req.Items[0].DisplayOrder != 1 {
		t.Errorf("Items[0].DisplayOrder mismatch")
	}
	if req.Items[1].DisplayOrder != 2 {
		t.Errorf("Items[1].DisplayOrder mismatch")
	}
}

func TestUpdateCustomFieldDefinitionRequestJSON(t *testing.T) {
	body := `{
		"fieldLabel": "Updated Label",
		"isActive": false,
		"displayOrder": 10
	}`

	var req UpdateCustomFieldDefinitionRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		t.Fatalf("failed to unmarshal UpdateCustomFieldDefinitionRequest: %v", err)
	}

	if req.FieldLabel == nil || *req.FieldLabel != "Updated Label" {
		t.Errorf("FieldLabel mismatch")
	}
	if req.IsActive == nil || *req.IsActive != false {
		t.Errorf("IsActive mismatch")
	}
	if req.DisplayOrder == nil || *req.DisplayOrder != 10 {
		t.Errorf("DisplayOrder mismatch")
	}
}

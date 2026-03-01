package customfields

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Custom Field Definition
// ──────────────────────────────────────────────

// CustomFieldDefinition represents a tenant-scoped custom field definition for a specific entity type.
type CustomFieldDefinition struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenantId"`
	EntityType      string          `json:"entityType"`
	FieldKey        string          `json:"fieldKey"`
	FieldLabel      string          `json:"fieldLabel"`
	FieldType       string          `json:"fieldType"`
	Description     string          `json:"description"`
	IsRequired      bool            `json:"isRequired"`
	IsFilterable    bool            `json:"isFilterable"`
	IsVisibleInList bool            `json:"isVisibleInList"`
	DisplayOrder    int             `json:"displayOrder"`
	ValidationRules json.RawMessage `json:"validationRules"`
	DefaultValue    *string         `json:"defaultValue"`
	IsActive        bool            `json:"isActive"`
	CreatedBy       uuid.UUID       `json:"createdBy"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// Valid Entity Types
// ──────────────────────────────────────────────

// ValidEntityTypes maps custom-field entity type keys to their database table names.
var ValidEntityTypes = map[string]string{
	"ticket":    "tickets",
	"project":   "projects",
	"work_item": "work_items",
	"asset":     "assets",
	"vendor":    "vendors",
	"contract":  "contracts",
	"risk":      "risks",
}

// ──────────────────────────────────────────────
// Valid Field Types
// ──────────────────────────────────────────────

// ValidFieldTypes is the set of supported custom field types.
var ValidFieldTypes = map[string]bool{
	"text":           true,
	"textarea":       true,
	"number":         true,
	"decimal":        true,
	"boolean":        true,
	"date":           true,
	"datetime":       true,
	"select":         true,
	"multiselect":    true,
	"url":            true,
	"email":          true,
	"phone":          true,
	"user_reference": true,
}

// ──────────────────────────────────────────────
// Request Types
// ──────────────────────────────────────────────

// CreateCustomFieldDefinitionRequest is the payload for creating a custom field definition.
type CreateCustomFieldDefinitionRequest struct {
	EntityType      string          `json:"entityType"`
	FieldKey        string          `json:"fieldKey"`
	FieldLabel      string          `json:"fieldLabel"`
	FieldType       string          `json:"fieldType"`
	Description     string          `json:"description"`
	IsRequired      bool            `json:"isRequired"`
	IsFilterable    bool            `json:"isFilterable"`
	IsVisibleInList bool            `json:"isVisibleInList"`
	DisplayOrder    int             `json:"displayOrder"`
	ValidationRules json.RawMessage `json:"validationRules"`
	DefaultValue    *string         `json:"defaultValue"`
}

// UpdateCustomFieldDefinitionRequest is the payload for updating a custom field definition.
// All pointer fields allow partial updates.
type UpdateCustomFieldDefinitionRequest struct {
	FieldLabel      *string          `json:"fieldLabel"`
	Description     *string          `json:"description"`
	IsRequired      *bool            `json:"isRequired"`
	IsFilterable    *bool            `json:"isFilterable"`
	IsVisibleInList *bool            `json:"isVisibleInList"`
	DisplayOrder    *int             `json:"displayOrder"`
	ValidationRules *json.RawMessage `json:"validationRules"`
	DefaultValue    *string          `json:"defaultValue"`
	IsActive        *bool            `json:"isActive"`
}

// ReorderRequest is the payload for batch-reordering custom field definitions.
type ReorderRequest struct {
	Items []ReorderItem `json:"items"`
}

// ReorderItem represents a single item in a reorder batch.
type ReorderItem struct {
	ID           uuid.UUID `json:"id"`
	DisplayOrder int       `json:"displayOrder"`
}

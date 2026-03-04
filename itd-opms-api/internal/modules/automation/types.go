package automation

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Trigger Type Constants
// ──────────────────────────────────────────────

const (
	TriggerTypeEvent     = "event"
	TriggerTypeSchedule  = "schedule"
	TriggerTypeCondition = "condition"
)

// ValidTriggerTypes is the set of supported trigger types.
var ValidTriggerTypes = map[string]bool{
	TriggerTypeEvent:     true,
	TriggerTypeSchedule:  true,
	TriggerTypeCondition: true,
}

// ──────────────────────────────────────────────
// Action Type Constants
// ──────────────────────────────────────────────

const (
	ActionTypeUpdateField       = "update_field"
	ActionTypeAssignQueue       = "assign_queue"
	ActionTypeAssignUser        = "assign_user"
	ActionTypeSendNotification  = "send_notification"
	ActionTypeStartApproval     = "start_approval"
	ActionTypeCreateActionItem  = "create_action_item"
	ActionTypeWebhook           = "webhook"
	ActionTypeEscalate          = "escalate"
	ActionTypeSetPriority       = "set_priority"
	ActionTypeAddTag            = "add_tag"
	ActionTypeAddComment        = "add_comment"
)

// ValidActionTypes is the set of supported action types.
var ValidActionTypes = map[string]bool{
	ActionTypeUpdateField:      true,
	ActionTypeAssignQueue:      true,
	ActionTypeAssignUser:       true,
	ActionTypeSendNotification: true,
	ActionTypeStartApproval:    true,
	ActionTypeCreateActionItem: true,
	ActionTypeWebhook:          true,
	ActionTypeEscalate:         true,
	ActionTypeSetPriority:      true,
	ActionTypeAddTag:           true,
	ActionTypeAddComment:       true,
}

// ──────────────────────────────────────────────
// Condition Operator Constants
// ──────────────────────────────────────────────

const (
	OperatorEq        = "eq"
	OperatorNeq       = "neq"
	OperatorGt        = "gt"
	OperatorLt        = "lt"
	OperatorContains  = "contains"
	OperatorIsNull    = "is_null"
	OperatorIsNotNull = "is_not_null"
	OperatorIn        = "in"
)

// ValidOperators is the set of supported condition operators.
var ValidOperators = map[string]bool{
	OperatorEq:        true,
	OperatorNeq:       true,
	OperatorGt:        true,
	OperatorLt:        true,
	OperatorContains:  true,
	OperatorIsNull:    true,
	OperatorIsNotNull: true,
	OperatorIn:        true,
}

// ──────────────────────────────────────────────
// Execution Status Constants
// ──────────────────────────────────────────────

const (
	ExecutionStatusSuccess = "success"
	ExecutionStatusPartial = "partial"
	ExecutionStatusFailed  = "failed"
)

// ──────────────────────────────────────────────
// Entity Type Mapping
// ──────────────────────────────────────────────

// ValidEntityTypes maps entity type keys to their database table names.
var ValidEntityTypes = map[string]string{
	"ticket":    "tickets",
	"project":   "projects",
	"work_item": "work_items",
}

// ──────────────────────────────────────────────
// AutomationRule
// ──────────────────────────────────────────────

// AutomationRule represents a workflow automation rule stored in the database.
type AutomationRule struct {
	ID                   uuid.UUID       `json:"id"`
	TenantID             uuid.UUID       `json:"tenantId"`
	Name                 string          `json:"name"`
	Description          string          `json:"description"`
	IsActive             bool            `json:"isActive"`
	TriggerType          string          `json:"triggerType"`
	TriggerConfig        json.RawMessage `json:"triggerConfig"`
	ConditionConfig      json.RawMessage `json:"conditionConfig"`
	Actions              json.RawMessage `json:"actions"`
	MaxExecutionsPerHour int             `json:"maxExecutionsPerHour"`
	CooldownMinutes      int             `json:"cooldownMinutes"`
	ExecutionCount       int             `json:"executionCount"`
	LastExecutedAt       *time.Time      `json:"lastExecutedAt"`
	CreatedBy            uuid.UUID       `json:"createdBy"`
	OrgUnitID            *uuid.UUID      `json:"orgUnitId,omitempty"`
	CreatedAt            time.Time       `json:"createdAt"`
	UpdatedAt            time.Time       `json:"updatedAt"`
}

// ──────────────────────────────────────────────
// AutomationExecution
// ──────────────────────────────────────────────

// AutomationExecution represents a single execution of an automation rule.
type AutomationExecution struct {
	ID           uuid.UUID       `json:"id"`
	RuleID       uuid.UUID       `json:"ruleId"`
	TenantID     uuid.UUID       `json:"tenantId"`
	TriggerEvent json.RawMessage `json:"triggerEvent"`
	EntityType   string          `json:"entityType"`
	EntityID     uuid.UUID       `json:"entityId"`
	ActionsTaken json.RawMessage `json:"actionsTaken"`
	Status       string          `json:"status"`
	ErrorMessage *string         `json:"errorMessage"`
	DurationMs   int             `json:"durationMs"`
	ExecutedAt   time.Time       `json:"executedAt"`
}

// ──────────────────────────────────────────────
// AutomationStats
// ──────────────────────────────────────────────

// AutomationStats holds aggregate statistics for automation rules and executions.
type AutomationStats struct {
	TotalRules      int `json:"totalRules"`
	ActiveRules     int `json:"activeRules"`
	ExecutionsToday int `json:"executionsToday"`
	FailuresToday   int `json:"failuresToday"`
}

// ──────────────────────────────────────────────
// Request Types
// ──────────────────────────────────────────────

// CreateAutomationRuleRequest is the payload for creating an automation rule.
type CreateAutomationRuleRequest struct {
	Name                 string          `json:"name"`
	Description          string          `json:"description"`
	TriggerType          string          `json:"triggerType"`
	TriggerConfig        json.RawMessage `json:"triggerConfig"`
	ConditionConfig      json.RawMessage `json:"conditionConfig"`
	Actions              json.RawMessage `json:"actions"`
	MaxExecutionsPerHour int             `json:"maxExecutionsPerHour"`
	CooldownMinutes      int             `json:"cooldownMinutes"`
}

// UpdateAutomationRuleRequest is the payload for updating an automation rule.
// All pointer fields allow partial updates.
type UpdateAutomationRuleRequest struct {
	Name                 *string          `json:"name"`
	Description          *string          `json:"description"`
	TriggerType          *string          `json:"triggerType"`
	TriggerConfig        *json.RawMessage `json:"triggerConfig"`
	ConditionConfig      *json.RawMessage `json:"conditionConfig"`
	Actions              *json.RawMessage `json:"actions"`
	MaxExecutionsPerHour *int             `json:"maxExecutionsPerHour"`
	CooldownMinutes      *int             `json:"cooldownMinutes"`
}

// TestRuleRequest is the payload for dry-run testing a rule against an entity.
type TestRuleRequest struct {
	EntityType string    `json:"entityType"`
	EntityID   uuid.UUID `json:"entityId"`
}

// TestRuleResult holds the result of a dry-run rule evaluation.
type TestRuleResult struct {
	RuleID            uuid.UUID       `json:"ruleId"`
	RuleName          string          `json:"ruleName"`
	ConditionsMet     bool            `json:"conditionsMet"`
	MatchedConditions json.RawMessage `json:"matchedConditions"`
	ActionsToExecute  json.RawMessage `json:"actionsToExecute"`
	EntityData        json.RawMessage `json:"entityData"`
}

// ──────────────────────────────────────────────
// Helper Config Types (for documentation)
// ──────────────────────────────────────────────

// TriggerConfig describes the configuration for a rule trigger.
// For event triggers: { "event_type": "ticket.created", "entity_type": "ticket" }
// For schedule triggers: { "cron": "0 */15 * * *", "timezone": "Asia/Manila" }
// For condition triggers: { "entity_type": "ticket", "check_interval_minutes": 30 }
type TriggerConfig struct {
	EventType            string `json:"event_type,omitempty"`
	EntityType           string `json:"entity_type,omitempty"`
	Cron                 string `json:"cron,omitempty"`
	Timezone             string `json:"timezone,omitempty"`
	CheckIntervalMinutes int    `json:"check_interval_minutes,omitempty"`
}

// ConditionConfig describes the conditions that must be met for a rule to fire.
// { "logic": "and", "conditions": [{ "field": "status", "operator": "eq", "value": "open" }] }
type ConditionConfig struct {
	Logic      string      `json:"logic"` // "and" or "or"
	Conditions []Condition `json:"conditions"`
}

// Condition represents a single condition in a rule's condition configuration.
type Condition struct {
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    any    `json:"value"`
}

// ActionConfig describes a single action to be executed by a rule.
// { "type": "update_field", "config": { "field": "priority", "value": "high" } }
type ActionConfig struct {
	Type   string         `json:"type"`
	Config map[string]any `json:"config"`
}

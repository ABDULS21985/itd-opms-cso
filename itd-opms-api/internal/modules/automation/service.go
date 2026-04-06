package automation

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

// Service handles business logic for automation rules and executions.
type Service struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewService creates a new automation Service.
func NewService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Service {
	return &Service{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan Helpers
// ──────────────────────────────────────────────

const ruleColumns = `
	id, tenant_id, name, description, is_active, trigger_type,
	trigger_config, condition_config, actions,
	max_executions_per_hour, cooldown_minutes, execution_count,
	last_executed_at, created_by, org_unit_id, created_at, updated_at`

// executionCols is the canonical column list for execution queries with rule name JOIN.
// Table aliases: ae = automation_executions, ar = automation_rules.
const executionCols = `ae.id, ae.rule_id, ar.name, ae.tenant_id, ae.trigger_event,
	ae.entity_type, ae.entity_id, ae.actions_taken, ae.status,
	ae.error_message, ae.duration_ms, ae.executed_at`

const executionJoin = `FROM automation_executions ae
	JOIN automation_rules ar ON ar.id = ae.rule_id`

func scanRule(row pgx.Row) (AutomationRule, error) {
	var r AutomationRule
	err := row.Scan(
		&r.ID, &r.TenantID, &r.Name, &r.Description, &r.IsActive, &r.TriggerType,
		&r.TriggerConfig, &r.ConditionConfig, &r.Actions,
		&r.MaxExecutionsPerHour, &r.CooldownMinutes, &r.ExecutionCount,
		&r.LastExecutedAt, &r.CreatedBy, &r.OrgUnitID, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

func scanRules(rows pgx.Rows) ([]AutomationRule, error) {
	var rules []AutomationRule
	for rows.Next() {
		var r AutomationRule
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.Name, &r.Description, &r.IsActive, &r.TriggerType,
			&r.TriggerConfig, &r.ConditionConfig, &r.Actions,
			&r.MaxExecutionsPerHour, &r.CooldownMinutes, &r.ExecutionCount,
			&r.LastExecutedAt, &r.CreatedBy, &r.OrgUnitID, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if rules == nil {
		rules = []AutomationRule{}
	}
	return rules, nil
}

func scanExecution(row pgx.Row) (AutomationExecution, error) {
	var e AutomationExecution
	err := row.Scan(
		&e.ID, &e.RuleID, &e.RuleName, &e.TenantID, &e.TriggerEvent, &e.EntityType, &e.EntityID,
		&e.ActionsTaken, &e.Status, &e.ErrorMessage, &e.DurationMs, &e.ExecutedAt,
	)
	return e, err
}

func scanExecutions(rows pgx.Rows) ([]AutomationExecution, error) {
	var execs []AutomationExecution
	for rows.Next() {
		e, err := scanExecution(rows)
		if err != nil {
			return nil, err
		}
		execs = append(execs, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if execs == nil {
		execs = []AutomationExecution{}
	}
	return execs, nil
}

// ──────────────────────────────────────────────
// ListRules
// ──────────────────────────────────────────────

// ListRules returns a paginated, filterable, searchable list of automation rules.
func (s *Service) ListRules(ctx context.Context, isActive *bool, triggerType, search string, limit, offset int) ([]AutomationRule, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var whereClauses []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	whereClauses = append(whereClauses, "tenant_id = "+nextArg())
	args = append(args, auth.TenantID)

	if isActive != nil {
		whereClauses = append(whereClauses, "is_active = "+nextArg())
		args = append(args, *isActive)
	}

	if triggerType != "" {
		if !ValidTriggerTypes[triggerType] {
			return nil, 0, apperrors.BadRequest(fmt.Sprintf("invalid trigger type: %s", triggerType))
		}
		whereClauses = append(whereClauses, "trigger_type = "+nextArg())
		args = append(args, triggerType)
	}

	// Org-scope filter.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", argIdx+1)
	if orgClause != "" {
		whereClauses = append(whereClauses, orgClause)
		if orgParam != nil {
			args = append(args, orgParam)
			argIdx++
		}
	}

	// Full-text search across name and description.
	if search = strings.TrimSpace(search); search != "" {
		n1 := nextArg()
		n2 := nextArg()
		whereClauses = append(whereClauses, fmt.Sprintf("(name ILIKE %s OR description ILIKE %s)", n1, n2))
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	where := strings.Join(whereClauses, " AND ")

	// Count total matching rules.
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM automation_rules WHERE %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count automation rules", err)
	}

	// Fetch paginated rules.
	query := fmt.Sprintf(
		"SELECT %s FROM automation_rules WHERE %s ORDER BY created_at DESC LIMIT %s OFFSET %s",
		ruleColumns, where, nextArg(), nextArg(),
	)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list automation rules", err)
	}
	defer rows.Close()

	rules, err := scanRules(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan automation rules", err)
	}

	return rules, total, nil
}

// ──────────────────────────────────────────────
// GetRule
// ──────────────────────────────────────────────

// GetRule retrieves a single automation rule by ID.
func (s *Service) GetRule(ctx context.Context, id uuid.UUID) (*AutomationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := fmt.Sprintf("SELECT %s FROM automation_rules WHERE id = $1 AND tenant_id = $2", ruleColumns)

	rule, err := scanRule(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("AutomationRule", id.String())
		}
		return nil, apperrors.Internal("failed to get automation rule", err)
	}

	// Org-scope access check.
	if rule.OrgUnitID != nil && !auth.HasOrgAccess(*rule.OrgUnitID) {
		return nil, apperrors.NotFound("AutomationRule", id.String())
	}

	return &rule, nil
}

// ──────────────────────────────────────────────
// CreateRule
// ──────────────────────────────────────────────

// CreateRule creates a new automation rule.
func (s *Service) CreateRule(ctx context.Context, req CreateAutomationRuleRequest) (*AutomationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validate name.
	if strings.TrimSpace(req.Name) == "" {
		return nil, apperrors.BadRequest("rule name is required")
	}

	// Validate trigger type.
	if !ValidTriggerTypes[req.TriggerType] {
		return nil, apperrors.BadRequest(fmt.Sprintf("invalid trigger type: %s", req.TriggerType))
	}

	// Default JSONB fields to empty objects/arrays if nil.
	triggerConfig := req.TriggerConfig
	if triggerConfig == nil {
		triggerConfig = json.RawMessage("{}")
	}
	conditionConfig := req.ConditionConfig
	if conditionConfig == nil {
		conditionConfig = json.RawMessage("{}")
	}
	actions := req.Actions
	if actions == nil {
		actions = json.RawMessage("[]")
	}

	// Default rate limits.
	maxExec := req.MaxExecutionsPerHour
	if maxExec <= 0 {
		maxExec = 100
	}
	cooldown := req.CooldownMinutes
	if cooldown < 0 {
		cooldown = 0
	}

	id := uuid.New()
	now := time.Now().UTC()

	// Derive org_unit_id from authenticated user's scope.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		id2 := auth.OrgUnitID
		orgUnitID = &id2
	}

	query := `
		INSERT INTO automation_rules (
			id, tenant_id, name, description, is_active, trigger_type,
			trigger_config, condition_config, actions,
			max_executions_per_hour, cooldown_minutes, execution_count,
			last_executed_at, created_by, org_unit_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, true, $5,
			$6, $7, $8,
			$9, $10, 0,
			NULL, $11, $12, $13, $14
		)
		RETURNING ` + ruleColumns

	// Store NULL for empty description so the field stays nullable in the DB.
	var desc *string
	if strings.TrimSpace(req.Description) != "" {
		d := req.Description
		desc = &d
	}

	rule, err := scanRule(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, desc, req.TriggerType,
		triggerConfig, conditionConfig, actions,
		maxExec, cooldown,
		auth.UserID, orgUnitID, now, now,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create automation rule", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"name":         req.Name,
		"trigger_type": req.TriggerType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:automation_rule",
		EntityType: "automation_rule",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &rule, nil
}

// ──────────────────────────────────────────────
// UpdateRule
// ──────────────────────────────────────────────

// UpdateRule performs a partial update on an automation rule.
func (s *Service) UpdateRule(ctx context.Context, id uuid.UUID, req UpdateAutomationRuleRequest) (*AutomationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify rule exists.
	_, err := s.GetRule(ctx, id)
	if err != nil {
		return nil, err
	}

	// Build dynamic update query.
	var setClauses []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	if req.Name != nil {
		if strings.TrimSpace(*req.Name) == "" {
			return nil, apperrors.BadRequest("rule name cannot be empty")
		}
		setClauses = append(setClauses, "name = "+nextArg())
		args = append(args, *req.Name)
	}
	if req.Description != nil {
		setClauses = append(setClauses, "description = "+nextArg())
		// Store NULL for empty string so the column stays properly nullable.
		var descVal *string
		if strings.TrimSpace(*req.Description) != "" {
			descVal = req.Description
		}
		args = append(args, descVal)
	}
	if req.TriggerType != nil {
		if !ValidTriggerTypes[*req.TriggerType] {
			return nil, apperrors.BadRequest(fmt.Sprintf("invalid trigger type: %s", *req.TriggerType))
		}
		setClauses = append(setClauses, "trigger_type = "+nextArg())
		args = append(args, *req.TriggerType)
	}
	if req.TriggerConfig != nil {
		setClauses = append(setClauses, "trigger_config = "+nextArg())
		args = append(args, *req.TriggerConfig)
	}
	if req.ConditionConfig != nil {
		setClauses = append(setClauses, "condition_config = "+nextArg())
		args = append(args, *req.ConditionConfig)
	}
	if req.Actions != nil {
		setClauses = append(setClauses, "actions = "+nextArg())
		args = append(args, *req.Actions)
	}
	if req.MaxExecutionsPerHour != nil {
		setClauses = append(setClauses, "max_executions_per_hour = "+nextArg())
		args = append(args, *req.MaxExecutionsPerHour)
	}
	if req.CooldownMinutes != nil {
		setClauses = append(setClauses, "cooldown_minutes = "+nextArg())
		args = append(args, *req.CooldownMinutes)
	}

	if len(setClauses) == 0 {
		return nil, apperrors.BadRequest("no fields to update")
	}

	// Always update updated_at.
	now := time.Now().UTC()
	setClauses = append(setClauses, "updated_at = "+nextArg())
	args = append(args, now)

	// WHERE clause.
	idArg := nextArg()
	tenantArg := nextArg()
	args = append(args, id, auth.TenantID)

	query := fmt.Sprintf(
		"UPDATE automation_rules SET %s WHERE id = %s AND tenant_id = %s RETURNING %s",
		strings.Join(setClauses, ", "),
		idArg,
		tenantArg,
		ruleColumns,
	)

	rule, err := scanRule(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("AutomationRule", id.String())
		}
		return nil, apperrors.Internal("failed to update automation rule", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:automation_rule",
		EntityType: "automation_rule",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &rule, nil
}

// ──────────────────────────────────────────────
// DeleteRule
// ──────────────────────────────────────────────

// DeleteRule performs a hard delete of an automation rule and its execution history.
func (s *Service) DeleteRule(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	// Delete execution history first.
	_, err = tx.Exec(ctx, "DELETE FROM automation_executions WHERE rule_id = $1 AND tenant_id = $2", id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete automation executions", err)
	}

	// Delete the rule.
	result, err := tx.Exec(ctx, "DELETE FROM automation_rules WHERE id = $1 AND tenant_id = $2", id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete automation rule", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("AutomationRule", id.String())
	}

	if err := tx.Commit(ctx); err != nil {
		return apperrors.Internal("failed to commit delete transaction", err)
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:automation_rule",
		EntityType: "automation_rule",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// ToggleRule
// ──────────────────────────────────────────────

// ToggleRule flips the is_active flag of an automation rule.
func (s *Service) ToggleRule(ctx context.Context, id uuid.UUID) (*AutomationRule, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()
	query := fmt.Sprintf(
		`UPDATE automation_rules SET is_active = NOT is_active, updated_at = $1
		 WHERE id = $2 AND tenant_id = $3
		 RETURNING %s`, ruleColumns,
	)

	rule, err := scanRule(s.pool.QueryRow(ctx, query, now, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("AutomationRule", id.String())
		}
		return nil, apperrors.Internal("failed to toggle automation rule", err)
	}

	// Audit log.
	action := "activate:automation_rule"
	if !rule.IsActive {
		action = "deactivate:automation_rule"
	}
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     action,
		EntityType: "automation_rule",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &rule, nil
}

// ──────────────────────────────────────────────
// TestRule (dry-run)
// ──────────────────────────────────────────────

// TestRule evaluates a rule's conditions against a specific entity without executing actions.
func (s *Service) TestRule(ctx context.Context, id uuid.UUID, entityType string, entityID uuid.UUID) (*TestRuleResult, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Load the rule.
	rule, err := s.GetRule(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validate entity type.
	tableName, ok := ValidEntityTypes[entityType]
	if !ok {
		return nil, apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", entityType))
	}

	// Load entity data as JSON.
	var entityJSON json.RawMessage
	entityQuery := fmt.Sprintf("SELECT row_to_json(t) FROM (SELECT * FROM %s WHERE id = $1 AND tenant_id = $2) t", tableName)
	err = s.pool.QueryRow(ctx, entityQuery, entityID, auth.TenantID).Scan(&entityJSON)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound(entityType, entityID.String())
		}
		return nil, apperrors.Internal("failed to load entity for test", err)
	}

	// Parse entity data into a map for condition evaluation.
	var entityData map[string]any
	if err := json.Unmarshal(entityJSON, &entityData); err != nil {
		return nil, apperrors.Internal("failed to parse entity data", err)
	}

	// Parse condition config.
	var condConfig ConditionConfig
	if rule.ConditionConfig != nil && string(rule.ConditionConfig) != "{}" && string(rule.ConditionConfig) != "null" {
		if err := json.Unmarshal(rule.ConditionConfig, &condConfig); err != nil {
			return nil, apperrors.Internal("failed to parse condition config", err)
		}
	}

	// Evaluate conditions.
	conditionsMet := true
	var matchedConditions []Condition

	if len(condConfig.Conditions) > 0 {
		isAnd := condConfig.Logic != "or" // default to AND
		anyMatch := false
		allMatch := true

		for _, cond := range condConfig.Conditions {
			fieldValue, exists := entityData[cond.Field]
			matched := evaluateCondition(cond.Operator, fieldValue, cond.Value, exists)
			if matched {
				matchedConditions = append(matchedConditions, cond)
				anyMatch = true
			} else {
				allMatch = false
			}
		}

		if isAnd {
			conditionsMet = allMatch
		} else {
			conditionsMet = anyMatch
		}
	}

	// Parse actions.
	var actions json.RawMessage
	if conditionsMet {
		actions = rule.Actions
	} else {
		actions = json.RawMessage("[]")
	}

	matchedJSON, _ := json.Marshal(matchedConditions)

	result := &TestRuleResult{
		RuleID:            rule.ID,
		RuleName:          rule.Name,
		ConditionsMet:     conditionsMet,
		MatchedConditions: matchedJSON,
		ActionsToExecute:  actions,
		EntityData:        entityJSON,
	}

	return result, nil
}

// evaluateCondition checks if an entity field value matches a condition.
func evaluateCondition(operator string, fieldValue any, conditionValue any, exists bool) bool {
	switch operator {
	case OperatorIsNull:
		return !exists || fieldValue == nil
	case OperatorIsNotNull:
		return exists && fieldValue != nil
	case OperatorEq:
		return fmt.Sprintf("%v", fieldValue) == fmt.Sprintf("%v", conditionValue)
	case OperatorNeq:
		return fmt.Sprintf("%v", fieldValue) != fmt.Sprintf("%v", conditionValue)
	case OperatorGt:
		return compareNumeric(fieldValue, conditionValue) > 0
	case OperatorLt:
		return compareNumeric(fieldValue, conditionValue) < 0
	case OperatorContains:
		fieldStr := fmt.Sprintf("%v", fieldValue)
		condStr := fmt.Sprintf("%v", conditionValue)
		return strings.Contains(strings.ToLower(fieldStr), strings.ToLower(condStr))
	case OperatorIn:
		condStr := fmt.Sprintf("%v", conditionValue)
		fieldStr := fmt.Sprintf("%v", fieldValue)
		// conditionValue may be a comma-separated string or a JSON array.
		for _, item := range strings.Split(condStr, ",") {
			if strings.TrimSpace(item) == fieldStr {
				return true
			}
		}
		// Also check if conditionValue is a slice.
		if condSlice, ok := conditionValue.([]any); ok {
			for _, item := range condSlice {
				if fmt.Sprintf("%v", item) == fieldStr {
					return true
				}
			}
		}
		return false
	default:
		return false
	}
}

// compareNumeric attempts to compare two values as float64. Returns -1, 0, or 1.
func compareNumeric(a, b any) int {
	af := toFloat64(a)
	bf := toFloat64(b)
	if af < bf {
		return -1
	}
	if af > bf {
		return 1
	}
	return 0
}

// toFloat64 converts a value to float64, returning 0 on failure.
func toFloat64(v any) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	case json.Number:
		f, _ := val.Float64()
		return f
	case string:
		var f float64
		fmt.Sscanf(val, "%f", &f)
		return f
	default:
		return 0
	}
}

// ──────────────────────────────────────────────
// ListExecutions (per rule)
// ──────────────────────────────────────────────

// ListExecutions returns paginated execution logs for a specific rule.
func (s *Service) ListExecutions(ctx context.Context, ruleID uuid.UUID, status string, limit, offset int) ([]AutomationExecution, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Verify the user has org-scope access to the parent rule.
	if _, err := s.GetRule(ctx, ruleID); err != nil {
		return nil, 0, err
	}

	var whereClauses []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	// Use table aliases to avoid ambiguity with the JOIN.
	whereClauses = append(whereClauses, "ae.tenant_id = "+nextArg())
	args = append(args, auth.TenantID)

	whereClauses = append(whereClauses, "ae.rule_id = "+nextArg())
	args = append(args, ruleID)

	if status != "" {
		whereClauses = append(whereClauses, "ae.status = "+nextArg())
		args = append(args, status)
	}

	where := strings.Join(whereClauses, " AND ")

	// Count.
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) %s WHERE %s", executionJoin, where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count automation executions", err)
	}

	// Fetch — includes ar.name via executionJoin.
	query := fmt.Sprintf(
		"SELECT %s %s WHERE %s ORDER BY ae.executed_at DESC LIMIT %s OFFSET %s",
		executionCols, executionJoin, where, nextArg(), nextArg(),
	)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list automation executions", err)
	}
	defer rows.Close()

	execs, err := scanExecutions(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan automation executions", err)
	}

	return execs, total, nil
}

// ──────────────────────────────────────────────
// ListAllExecutions (across all rules)
// ──────────────────────────────────────────────

// ListAllExecutions returns paginated execution logs across all rules.
func (s *Service) ListAllExecutions(ctx context.Context, status string, limit, offset int) ([]AutomationExecution, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	var whereClauses []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	whereClauses = append(whereClauses, "ae.tenant_id = "+nextArg())
	args = append(args, auth.TenantID)

	if status != "" {
		whereClauses = append(whereClauses, "ae.status = "+nextArg())
		args = append(args, status)
	}

	// Org-scope filter via joined automation_rules table.
	orgClause, orgParam := types.BuildOrgFilter(auth, "ar.org_unit_id", argIdx+1)
	if orgClause != "" {
		whereClauses = append(whereClauses, orgClause)
		if orgParam != nil {
			args = append(args, orgParam)
			argIdx++
		}
	}

	where := strings.Join(whereClauses, " AND ")

	// Count.
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) %s WHERE %s", executionJoin, where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count automation executions", err)
	}

	// Fetch — use shared executionCols which includes ar.name.
	query := fmt.Sprintf(
		"SELECT %s %s WHERE %s ORDER BY ae.executed_at DESC LIMIT %s OFFSET %s",
		executionCols, executionJoin, where, nextArg(), nextArg(),
	)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list automation executions", err)
	}
	defer rows.Close()

	execs, err := scanExecutions(rows)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to scan automation executions", err)
	}

	return execs, total, nil
}

// ──────────────────────────────────────────────
// GetStats
// ──────────────────────────────────────────────

// GetStats returns aggregate statistics for automation rules and executions.
func (s *Service) GetStats(ctx context.Context) (*AutomationStats, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	stats := &AutomationStats{}

	// Org-scope filter for rules.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 2)
	rulesArgs := []any{auth.TenantID}
	orgSQL := ""
	if orgClause != "" {
		orgSQL = " AND " + orgClause
		if orgParam != nil {
			rulesArgs = append(rulesArgs, orgParam)
		}
	}

	// Total and active rules.
	rulesQuery := fmt.Sprintf(
		"SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM automation_rules WHERE tenant_id = $1%s",
		orgSQL,
	)
	err := s.pool.QueryRow(ctx, rulesQuery, rulesArgs...).Scan(&stats.TotalRules, &stats.ActiveRules)
	if err != nil {
		return nil, apperrors.Internal("failed to count automation rules", err)
	}

	// Executions today and failures today — join to rules for org filtering.
	today := time.Now().UTC().Truncate(24 * time.Hour)
	execOrgClause, execOrgParam := types.BuildOrgFilter(auth, "ar.org_unit_id", 3)
	execArgs := []any{auth.TenantID, today}
	execOrgSQL := ""
	if execOrgClause != "" {
		execOrgSQL = " AND " + execOrgClause
		if execOrgParam != nil {
			execArgs = append(execArgs, execOrgParam)
		}
	}

	execQuery := fmt.Sprintf(`SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE ae.status = 'failed')
		FROM automation_executions ae
		JOIN automation_rules ar ON ar.id = ae.rule_id
		WHERE ae.tenant_id = $1 AND ae.executed_at >= $2%s`, execOrgSQL)
	err = s.pool.QueryRow(ctx, execQuery, execArgs...).Scan(&stats.ExecutionsToday, &stats.FailuresToday)
	if err != nil {
		return nil, apperrors.Internal("failed to count automation executions", err)
	}

	return stats, nil
}

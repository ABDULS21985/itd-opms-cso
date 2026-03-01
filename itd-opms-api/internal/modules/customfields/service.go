package customfields

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
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

// Service handles business logic for custom field definitions and values.
type Service struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewService creates a new custom fields Service.
func NewService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *Service {
	return &Service{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

const definitionColumns = `
	id, tenant_id, entity_type, field_key, field_label,
	field_type, description, is_required, is_filterable, is_visible_in_list,
	display_order, validation_rules, default_value, is_active,
	created_by, created_at, updated_at`

func scanDefinition(row pgx.Row) (CustomFieldDefinition, error) {
	var d CustomFieldDefinition
	err := row.Scan(
		&d.ID, &d.TenantID, &d.EntityType, &d.FieldKey, &d.FieldLabel,
		&d.FieldType, &d.Description, &d.IsRequired, &d.IsFilterable, &d.IsVisibleInList,
		&d.DisplayOrder, &d.ValidationRules, &d.DefaultValue, &d.IsActive,
		&d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
	)
	return d, err
}

func scanDefinitions(rows pgx.Rows) ([]CustomFieldDefinition, error) {
	var defs []CustomFieldDefinition
	for rows.Next() {
		var d CustomFieldDefinition
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.EntityType, &d.FieldKey, &d.FieldLabel,
			&d.FieldType, &d.Description, &d.IsRequired, &d.IsFilterable, &d.IsVisibleInList,
			&d.DisplayOrder, &d.ValidationRules, &d.DefaultValue, &d.IsActive,
			&d.CreatedBy, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, err
		}
		defs = append(defs, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if defs == nil {
		defs = []CustomFieldDefinition{}
	}
	return defs, nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// toSnakeCase converts a human-readable label to a snake_case field key.
// Example: "Purchase Order Number" -> "purchase_order_number"
func toSnakeCase(label string) string {
	// Remove non-alphanumeric characters except spaces
	re := regexp.MustCompile(`[^a-zA-Z0-9\s]`)
	s := re.ReplaceAllString(label, "")

	// Collapse whitespace and trim
	s = strings.TrimSpace(s)
	re2 := regexp.MustCompile(`\s+`)
	s = re2.ReplaceAllString(s, "_")

	return strings.ToLower(s)
}

// ──────────────────────────────────────────────
// Definition CRUD
// ──────────────────────────────────────────────

// ListDefinitions returns all active custom field definitions for a given entity type,
// ordered by display_order.
func (s *Service) ListDefinitions(ctx context.Context, entityType string) ([]CustomFieldDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if _, ok := ValidEntityTypes[entityType]; !ok {
		return nil, apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", entityType))
	}

	query := `
		SELECT ` + definitionColumns + `
		FROM custom_field_definitions
		WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true
		ORDER BY display_order ASC, created_at ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, entityType)
	if err != nil {
		return nil, apperrors.Internal("failed to list custom field definitions", err)
	}
	defer rows.Close()

	defs, err := scanDefinitions(rows)
	if err != nil {
		return nil, apperrors.Internal("failed to scan custom field definitions", err)
	}

	return defs, nil
}

// GetDefinition retrieves a single custom field definition by ID.
func (s *Service) GetDefinition(ctx context.Context, id uuid.UUID) (*CustomFieldDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + definitionColumns + ` FROM custom_field_definitions WHERE id = $1 AND tenant_id = $2`

	def, err := scanDefinition(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("CustomFieldDefinition", id.String())
		}
		return nil, apperrors.Internal("failed to get custom field definition", err)
	}

	return &def, nil
}

// CreateDefinition creates a new custom field definition.
func (s *Service) CreateDefinition(ctx context.Context, req CreateCustomFieldDefinitionRequest) (*CustomFieldDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validate entity type.
	if _, ok := ValidEntityTypes[req.EntityType]; !ok {
		return nil, apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", req.EntityType))
	}

	// Validate field type.
	if !ValidFieldTypes[req.FieldType] {
		return nil, apperrors.BadRequest(fmt.Sprintf("invalid field type: %s", req.FieldType))
	}

	// Validate label.
	if strings.TrimSpace(req.FieldLabel) == "" {
		return nil, apperrors.BadRequest("field label is required")
	}

	// Auto-generate field_key from label if not provided.
	fieldKey := strings.TrimSpace(req.FieldKey)
	if fieldKey == "" {
		fieldKey = toSnakeCase(req.FieldLabel)
	}

	if fieldKey == "" {
		return nil, apperrors.BadRequest("field key cannot be empty")
	}

	// Check for duplicate field_key within the same entity type and tenant.
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM custom_field_definitions WHERE tenant_id = $1 AND entity_type = $2 AND field_key = $3 AND is_active = true)`,
		auth.TenantID, req.EntityType, fieldKey,
	).Scan(&exists)
	if err != nil {
		return nil, apperrors.Internal("failed to check for duplicate field key", err)
	}
	if exists {
		return nil, apperrors.Conflict(fmt.Sprintf("a custom field with key '%s' already exists for entity type '%s'", fieldKey, req.EntityType))
	}

	// Default validation rules to empty object.
	validationRules := req.ValidationRules
	if validationRules == nil {
		validationRules = json.RawMessage("{}")
	}

	id := uuid.New()
	now := time.Now().UTC()

	query := `
		INSERT INTO custom_field_definitions (
			id, tenant_id, entity_type, field_key, field_label,
			field_type, description, is_required, is_filterable, is_visible_in_list,
			display_order, validation_rules, default_value, is_active,
			created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, true,
			$14, $15, $16
		)
		RETURNING ` + definitionColumns

	def, err := scanDefinition(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.EntityType, fieldKey, req.FieldLabel,
		req.FieldType, req.Description, req.IsRequired, req.IsFilterable, req.IsVisibleInList,
		req.DisplayOrder, validationRules, req.DefaultValue,
		auth.UserID, now, now,
	))
	if err != nil {
		return nil, apperrors.Internal("failed to create custom field definition", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"entity_type": req.EntityType,
		"field_key":   fieldKey,
		"field_label": req.FieldLabel,
		"field_type":  req.FieldType,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:custom_field_definition",
		EntityType: "custom_field_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &def, nil
}

// UpdateDefinition performs a partial update on a custom field definition.
func (s *Service) UpdateDefinition(ctx context.Context, id uuid.UUID, req UpdateCustomFieldDefinitionRequest) (*CustomFieldDefinition, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Verify definition exists.
	_, err := s.GetDefinition(ctx, id)
	if err != nil {
		return nil, err
	}

	// Build dynamic update query.
	var setClauses []string
	var args []any
	argIdx := 0
	nextArg := func() string { argIdx++; return fmt.Sprintf("$%d", argIdx) }

	if req.FieldLabel != nil {
		setClauses = append(setClauses, "field_label = "+nextArg())
		args = append(args, *req.FieldLabel)
	}
	if req.Description != nil {
		setClauses = append(setClauses, "description = "+nextArg())
		args = append(args, *req.Description)
	}
	if req.IsRequired != nil {
		setClauses = append(setClauses, "is_required = "+nextArg())
		args = append(args, *req.IsRequired)
	}
	if req.IsFilterable != nil {
		setClauses = append(setClauses, "is_filterable = "+nextArg())
		args = append(args, *req.IsFilterable)
	}
	if req.IsVisibleInList != nil {
		setClauses = append(setClauses, "is_visible_in_list = "+nextArg())
		args = append(args, *req.IsVisibleInList)
	}
	if req.DisplayOrder != nil {
		setClauses = append(setClauses, "display_order = "+nextArg())
		args = append(args, *req.DisplayOrder)
	}
	if req.ValidationRules != nil {
		setClauses = append(setClauses, "validation_rules = "+nextArg())
		args = append(args, *req.ValidationRules)
	}
	if req.DefaultValue != nil {
		setClauses = append(setClauses, "default_value = "+nextArg())
		args = append(args, *req.DefaultValue)
	}
	if req.IsActive != nil {
		setClauses = append(setClauses, "is_active = "+nextArg())
		args = append(args, *req.IsActive)
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
		`UPDATE custom_field_definitions SET %s WHERE id = %s AND tenant_id = %s RETURNING %s`,
		strings.Join(setClauses, ", "),
		idArg,
		tenantArg,
		definitionColumns,
	)

	def, err := scanDefinition(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("CustomFieldDefinition", id.String())
		}
		return nil, apperrors.Internal("failed to update custom field definition", err)
	}

	// Audit log.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:custom_field_definition",
		EntityType: "custom_field_definition",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return &def, nil
}

// DeleteDefinition performs a soft delete by setting is_active to false.
func (s *Service) DeleteDefinition(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	result, err := s.pool.Exec(ctx,
		`UPDATE custom_field_definitions SET is_active = false, updated_at = $1 WHERE id = $2 AND tenant_id = $3`,
		now, id, auth.TenantID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete custom field definition", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CustomFieldDefinition", id.String())
	}

	// Audit log.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:custom_field_definition",
		EntityType: "custom_field_definition",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ReorderDefinitions batch-updates the display_order for definitions of a given entity type.
func (s *Service) ReorderDefinitions(ctx context.Context, entityType string, items []ReorderItem) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	if _, ok := ValidEntityTypes[entityType]; !ok {
		return apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", entityType))
	}

	if len(items) == 0 {
		return apperrors.BadRequest("no items to reorder")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal("failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	for _, item := range items {
		result, err := tx.Exec(ctx,
			`UPDATE custom_field_definitions SET display_order = $1, updated_at = $2 WHERE id = $3 AND tenant_id = $4 AND entity_type = $5`,
			item.DisplayOrder, time.Now().UTC(), item.ID, auth.TenantID, entityType,
		)
		if err != nil {
			return apperrors.Internal("failed to update display order", err)
		}
		if result.RowsAffected() == 0 {
			return apperrors.NotFound("CustomFieldDefinition", item.ID.String())
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return apperrors.Internal("failed to commit reorder transaction", err)
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"entity_type": entityType,
		"items":       items,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "reorder:custom_field_definitions",
		EntityType: "custom_field_definition",
		EntityID:   uuid.Nil,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Entity Custom Field Values
// ──────────────────────────────────────────────

// GetValues reads the custom_fields JSONB column from the entity's table.
func (s *Service) GetValues(ctx context.Context, entityType string, entityID uuid.UUID) (map[string]any, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	tableName, ok := ValidEntityTypes[entityType]
	if !ok {
		return nil, apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", entityType))
	}

	query := fmt.Sprintf(
		`SELECT COALESCE(custom_fields, '{}') FROM %s WHERE id = $1 AND tenant_id = $2`,
		tableName,
	)

	var raw json.RawMessage
	err := s.pool.QueryRow(ctx, query, entityID, auth.TenantID).Scan(&raw)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound(entityType, entityID.String())
		}
		return nil, apperrors.Internal("failed to get custom field values", err)
	}

	var values map[string]any
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, apperrors.Internal("failed to unmarshal custom field values", err)
	}

	return values, nil
}

// UpdateValues validates custom field values against their definitions, then writes them
// to the entity's custom_fields JSONB column.
func (s *Service) UpdateValues(ctx context.Context, entityType string, entityID uuid.UUID, values map[string]any) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tableName, ok := ValidEntityTypes[entityType]
	if !ok {
		return apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", entityType))
	}

	// Validate values against definitions.
	if err := s.ValidateValues(ctx, auth.TenantID, entityType, values); err != nil {
		return err
	}

	valuesJSON, err := json.Marshal(values)
	if err != nil {
		return apperrors.Internal("failed to marshal custom field values", err)
	}

	now := time.Now().UTC()

	query := fmt.Sprintf(
		`UPDATE %s SET custom_fields = $1, updated_at = $2 WHERE id = $3 AND tenant_id = $4`,
		tableName,
	)

	result, err := s.pool.Exec(ctx, query, valuesJSON, now, entityID, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to update custom field values", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound(entityType, entityID.String())
	}

	// Audit log.
	changes, _ := json.Marshal(map[string]any{
		"entity_type": entityType,
		"entity_id":   entityID,
		"values":      values,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:custom_field_values",
		EntityType: entityType,
		EntityID:   entityID,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ValidateValues validates custom field values against their definitions.
// It checks that required fields are present and that values match expected types.
func (s *Service) ValidateValues(ctx context.Context, tenantID uuid.UUID, entityType string, values map[string]any) error {
	if _, ok := ValidEntityTypes[entityType]; !ok {
		return apperrors.BadRequest(fmt.Sprintf("invalid entity type: %s", entityType))
	}

	// Load active definitions for this entity type.
	query := `
		SELECT ` + definitionColumns + `
		FROM custom_field_definitions
		WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true
		ORDER BY display_order ASC`

	rows, err := s.pool.Query(ctx, query, tenantID, entityType)
	if err != nil {
		return apperrors.Internal("failed to load custom field definitions for validation", err)
	}
	defer rows.Close()

	defs, err := scanDefinitions(rows)
	if err != nil {
		return apperrors.Internal("failed to scan custom field definitions for validation", err)
	}

	// Build a map for quick lookup.
	defMap := make(map[string]CustomFieldDefinition, len(defs))
	for _, d := range defs {
		defMap[d.FieldKey] = d
	}

	// Check required fields.
	for _, d := range defs {
		if !d.IsRequired {
			continue
		}
		val, exists := values[d.FieldKey]
		if !exists || val == nil || val == "" {
			return apperrors.BadRequest(fmt.Sprintf("custom field '%s' is required", d.FieldLabel))
		}
	}

	// Type validation for provided values.
	for key, val := range values {
		def, exists := defMap[key]
		if !exists {
			// Unknown keys are silently ignored (or could be stripped).
			continue
		}

		if val == nil {
			continue
		}

		if err := validateFieldType(def.FieldType, val); err != nil {
			return apperrors.BadRequest(fmt.Sprintf("custom field '%s': %s", def.FieldLabel, err.Error()))
		}
	}

	return nil
}

// validateFieldType checks that a value matches the expected field type.
func validateFieldType(fieldType string, val any) error {
	switch fieldType {
	case "text", "textarea", "url", "email", "phone":
		if _, ok := val.(string); !ok {
			return fmt.Errorf("expected string value")
		}
	case "number":
		switch val.(type) {
		case float64, int, int64:
			// OK
		default:
			return fmt.Errorf("expected numeric value")
		}
	case "decimal":
		switch val.(type) {
		case float64, int, int64:
			// OK
		default:
			return fmt.Errorf("expected decimal value")
		}
	case "boolean":
		if _, ok := val.(bool); !ok {
			return fmt.Errorf("expected boolean value")
		}
	case "date", "datetime":
		if s, ok := val.(string); ok {
			if fieldType == "date" {
				if _, err := time.Parse("2006-01-02", s); err != nil {
					return fmt.Errorf("expected date in YYYY-MM-DD format")
				}
			} else {
				if _, err := time.Parse(time.RFC3339, s); err != nil {
					return fmt.Errorf("expected datetime in RFC3339 format")
				}
			}
		} else {
			return fmt.Errorf("expected date string value")
		}
	case "select", "user_reference":
		if _, ok := val.(string); !ok {
			return fmt.Errorf("expected string value")
		}
	case "multiselect":
		switch v := val.(type) {
		case []any:
			for i, item := range v {
				if _, ok := item.(string); !ok {
					return fmt.Errorf("expected string value at index %d", i)
				}
			}
		default:
			return fmt.Errorf("expected array of strings")
		}
	}

	return nil
}

package system

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// SettingsService
// ──────────────────────────────────────────────

// SettingsService handles business logic for system settings.
type SettingsService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewSettingsService creates a new SettingsService.
func NewSettingsService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *SettingsService {
	return &SettingsService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanSetting(row pgx.Row) (SystemSetting, error) {
	var s SystemSetting
	err := row.Scan(
		&s.ID, &s.TenantID, &s.Category, &s.Key, &s.Value,
		&s.Description, &s.IsSecret, &s.UpdatedBy, &s.UpdatedAt, &s.CreatedAt,
	)
	return s, err
}

func scanSettings(rows pgx.Rows) ([]SystemSetting, error) {
	var settings []SystemSetting
	for rows.Next() {
		var s SystemSetting
		if err := rows.Scan(
			&s.ID, &s.TenantID, &s.Category, &s.Key, &s.Value,
			&s.Description, &s.IsSecret, &s.UpdatedBy, &s.UpdatedAt, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		settings = append(settings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if settings == nil {
		settings = []SystemSetting{}
	}
	return settings, nil
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

// ListSettings returns all settings for a category, resolving tenant overrides.
// Tenant-specific settings take precedence over global defaults.
func (s *SettingsService) ListSettings(ctx context.Context, tenantID uuid.UUID, category string) ([]SystemSetting, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT s.id, s.tenant_id, s.category, s.key, s.value,
		       s.description, s.is_secret, s.updated_by, s.updated_at, s.created_at
		FROM system_settings s
		WHERE s.category = $1
		  AND (s.tenant_id IS NULL OR s.tenant_id = $2)
		ORDER BY s.key ASC`, category, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list settings: %w", err)
	}
	defer rows.Close()

	all, err := scanSettings(rows)
	if err != nil {
		return nil, err
	}

	// Resolve overrides: for each key, prefer tenant-scoped over global.
	resolved := make(map[string]SystemSetting)
	for _, setting := range all {
		existing, ok := resolved[setting.Key]
		if !ok {
			resolved[setting.Key] = setting
		} else {
			// Tenant-specific overrides global (global has nil tenant_id).
			if setting.TenantID != nil && existing.TenantID == nil {
				resolved[setting.Key] = setting
			}
		}
	}

	result := make([]SystemSetting, 0, len(resolved))
	for _, v := range resolved {
		// Mask secret values.
		if v.IsSecret {
			v.Value = json.RawMessage(`"********"`)
		}
		result = append(result, v)
	}

	return result, nil
}

// GetSetting returns a single setting, resolving tenant override.
func (s *SettingsService) GetSetting(ctx context.Context, tenantID uuid.UUID, category, key string) (*SystemSetting, error) {
	setting, err := scanSetting(s.pool.QueryRow(ctx, `
		SELECT s.id, s.tenant_id, s.category, s.key, s.value,
		       s.description, s.is_secret, s.updated_by, s.updated_at, s.created_at
		FROM system_settings s
		WHERE s.category = $1 AND s.key = $2
		  AND (s.tenant_id = $3 OR (s.tenant_id IS NULL AND NOT EXISTS (
		       SELECT 1 FROM system_settings s2
		       WHERE s2.category = $1 AND s2.key = $2 AND s2.tenant_id = $3)))
		ORDER BY s.tenant_id NULLS LAST
		LIMIT 1`, category, key, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("setting", category+"/"+key)
		}
		return nil, fmt.Errorf("get setting: %w", err)
	}

	if setting.IsSecret {
		setting.Value = json.RawMessage(`"********"`)
	}

	return &setting, nil
}

// UpdateSetting upserts a setting value and creates an audit event.
func (s *SettingsService) UpdateSetting(ctx context.Context, tenantID uuid.UUID, category, key string, value json.RawMessage) (*SystemSetting, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Get previous value for audit.
	prevSetting, _ := s.getSettingRaw(ctx, tenantID, category, key)

	setting, err := scanSetting(s.pool.QueryRow(ctx, `
		INSERT INTO system_settings (tenant_id, category, key, value, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (tenant_id, category, key) DO UPDATE SET
		  value = $4, updated_by = $5, updated_at = NOW()
		RETURNING id, tenant_id, category, key, value, description, is_secret, updated_by, updated_at, created_at`,
		tenantID, category, key, value, auth.UserID))
	if err != nil {
		return nil, fmt.Errorf("upsert setting: %w", err)
	}

	changes, _ := json.Marshal(map[string]any{"category": category, "key": key, "value": value})
	var prevState json.RawMessage
	if prevSetting != nil {
		prevState, _ = json.Marshal(prevSetting)
	}
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "setting.updated",
		EntityType:    "system_setting",
		EntityID:      setting.ID,
		Changes:       changes,
		PreviousState: prevState,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return &setting, nil
}

// ResetSetting removes a tenant override, falling back to the global default.
func (s *SettingsService) ResetSetting(ctx context.Context, tenantID uuid.UUID, category, key string) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	tag, err := s.pool.Exec(ctx, `
		DELETE FROM system_settings
		WHERE category = $1 AND key = $2 AND tenant_id = $3`,
		category, key, tenantID)
	if err != nil {
		return fmt.Errorf("reset setting: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("tenant setting", category+"/"+key)
	}

	changes, _ := json.Marshal(map[string]string{"category": category, "key": key, "action": "reset_to_global"})
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "setting.reset",
		EntityType:    "system_setting",
		EntityID:      uuid.Nil,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// GetAllCategories returns all distinct setting categories.
func (s *SettingsService) GetAllCategories(ctx context.Context) ([]string, error) {
	rows, err := s.pool.Query(ctx, "SELECT DISTINCT category FROM system_settings ORDER BY category")
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if categories == nil {
		categories = []string{}
	}
	return categories, nil
}

// getSettingRaw returns a setting without masking secrets (for internal use/audit).
func (s *SettingsService) getSettingRaw(ctx context.Context, tenantID uuid.UUID, category, key string) (*SystemSetting, error) {
	setting, err := scanSetting(s.pool.QueryRow(ctx, `
		SELECT s.id, s.tenant_id, s.category, s.key, s.value,
		       s.description, s.is_secret, s.updated_by, s.updated_at, s.created_at
		FROM system_settings s
		WHERE s.category = $1 AND s.key = $2
		  AND (s.tenant_id = $3 OR (s.tenant_id IS NULL AND NOT EXISTS (
		       SELECT 1 FROM system_settings s2
		       WHERE s2.category = $1 AND s2.key = $2 AND s2.tenant_id = $3)))
		ORDER BY s.tenant_id NULLS LAST
		LIMIT 1`, category, key, tenantID))
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

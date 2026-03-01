package system

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// RoleService
// ──────────────────────────────────────────────

// RoleService handles business logic for role management.
type RoleService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewRoleService creates a new RoleService.
func NewRoleService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *RoleService {
	return &RoleService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanRoleDetail(row pgx.Row) (RoleDetail, error) {
	var r RoleDetail
	err := row.Scan(
		&r.ID, &r.Name, &r.Description, &r.Permissions,
		&r.IsSystem, &r.CreatedAt, &r.UserCount,
	)
	return r, err
}

func scanRoleDetails(rows pgx.Rows) ([]RoleDetail, error) {
	var roles []RoleDetail
	for rows.Next() {
		var r RoleDetail
		if err := rows.Scan(
			&r.ID, &r.Name, &r.Description, &r.Permissions,
			&r.IsSystem, &r.CreatedAt, &r.UserCount,
		); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if roles == nil {
		roles = []RoleDetail{}
	}
	return roles, nil
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

// ListRoles returns all roles with user counts.
func (s *RoleService) ListRoles(ctx context.Context) ([]RoleDetail, error) {
	query := `
		SELECT r.id, r.name, r.description, r.permissions, r.is_system, r.created_at,
		       (SELECT COUNT(*) FROM role_bindings rb WHERE rb.role_id = r.id AND rb.is_active = true) AS user_count
		FROM roles r
		ORDER BY r.is_system DESC, r.name ASC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()

	return scanRoleDetails(rows)
}

// GetRole returns a single role with user count.
func (s *RoleService) GetRole(ctx context.Context, roleID uuid.UUID) (*RoleDetail, error) {
	query := `
		SELECT r.id, r.name, r.description, r.permissions, r.is_system, r.created_at,
		       (SELECT COUNT(*) FROM role_bindings rb WHERE rb.role_id = r.id AND rb.is_active = true) AS user_count
		FROM roles r
		WHERE r.id = $1`

	role, err := scanRoleDetail(s.pool.QueryRow(ctx, query, roleID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("role", roleID.String())
		}
		return nil, fmt.Errorf("get role: %w", err)
	}

	return &role, nil
}

// CreateRole creates a new custom role.
func (s *RoleService) CreateRole(ctx context.Context, req CreateRoleRequest) (*RoleDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validations.
	if req.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}
	if len(req.Name) < 3 || len(req.Name) > 50 {
		return nil, apperrors.BadRequest("name must be between 3 and 50 characters")
	}
	if len(req.Permissions) == 0 {
		return nil, apperrors.BadRequest("at least one permission is required")
	}

	// Check for duplicate name.
	var existingID uuid.UUID
	err := s.pool.QueryRow(ctx, "SELECT id FROM roles WHERE name = $1", req.Name).Scan(&existingID)
	if err == nil {
		return nil, apperrors.Conflict("role with name '" + req.Name + "' already exists")
	}
	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("check role name: %w", err)
	}

	permJSON, err := json.Marshal(req.Permissions)
	if err != nil {
		return nil, fmt.Errorf("marshal permissions: %w", err)
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO roles (name, description, permissions, is_system)
		VALUES ($1, $2, $3, false)
		RETURNING id, name, description, permissions, is_system, created_at`,
		req.Name, req.Description, permJSON,
	)

	var role RoleDetail
	err = row.Scan(&role.ID, &role.Name, &role.Description, &role.Permissions, &role.IsSystem, &role.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create role: %w", err)
	}
	role.UserCount = 0

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "role.created",
		EntityType:    "role",
		EntityID:      role.ID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return &role, nil
}

// UpdateRole updates a custom role's description and/or permissions. System roles cannot be updated.
func (s *RoleService) UpdateRole(ctx context.Context, roleID uuid.UUID, req UpdateRoleRequest) (*RoleDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Get existing role.
	existing, err := s.GetRole(ctx, roleID)
	if err != nil {
		return nil, err
	}
	if existing.IsSystem {
		return nil, apperrors.Forbidden("system roles cannot be modified")
	}

	// Update.
	description := ""
	if req.Description != nil {
		description = *req.Description
	}

	updatePerms := len(req.Permissions) > 0
	var permJSON json.RawMessage
	if updatePerms {
		permJSON, err = json.Marshal(req.Permissions)
		if err != nil {
			return nil, fmt.Errorf("marshal permissions: %w", err)
		}
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE roles SET
		  description = COALESCE(NULLIF($2, ''), description),
		  permissions = CASE WHEN $3::boolean THEN $4 ELSE permissions END
		WHERE id = $1 AND is_system = false`,
		roleID, description, updatePerms, permJSON,
	)
	if err != nil {
		return nil, fmt.Errorf("update role: %w", err)
	}

	changes, _ := json.Marshal(req)
	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "role.updated",
		EntityType:    "role",
		EntityID:      roleID,
		Changes:       changes,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return s.GetRole(ctx, roleID)
}

// DeleteRole deletes a custom role if it has no active bindings. System roles cannot be deleted.
func (s *RoleService) DeleteRole(ctx context.Context, roleID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetRole(ctx, roleID)
	if err != nil {
		return err
	}
	if existing.IsSystem {
		return apperrors.Forbidden("system roles cannot be deleted")
	}

	// Check for active bindings.
	var bindingCount int64
	err = s.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM role_bindings WHERE role_id = $1 AND is_active = true",
		roleID,
	).Scan(&bindingCount)
	if err != nil {
		return fmt.Errorf("count bindings: %w", err)
	}
	if bindingCount > 0 {
		return apperrors.Conflict(fmt.Sprintf("cannot delete role with %d active binding(s)", bindingCount))
	}

	_, err = s.pool.Exec(ctx, "DELETE FROM roles WHERE id = $1 AND is_system = false", roleID)
	if err != nil {
		return fmt.Errorf("delete role: %w", err)
	}

	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "role.deleted",
		EntityType:    "role",
		EntityID:      roleID,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// ──────────────────────────────────────────────
// Permission Catalog
// ──────────────────────────────────────────────

// GetPermissionCatalog returns all available permissions grouped by module.
func (s *RoleService) GetPermissionCatalog(ctx context.Context) ([]PermissionCatalog, error) {
	rows, err := s.pool.Query(ctx, "SELECT permissions FROM roles")
	if err != nil {
		return nil, fmt.Errorf("query roles: %w", err)
	}
	defer rows.Close()

	permSet := make(map[string]bool)
	for rows.Next() {
		var permsJSON json.RawMessage
		if err := rows.Scan(&permsJSON); err != nil {
			return nil, err
		}

		var perms []string
		if err := json.Unmarshal(permsJSON, &perms); err != nil {
			continue
		}
		for _, p := range perms {
			if p != "*" {
				permSet[p] = true
			}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Group by module (prefix before '.').
	modulePerms := make(map[string][]string)
	for perm := range permSet {
		parts := strings.SplitN(perm, ".", 2)
		module := parts[0]
		modulePerms[module] = append(modulePerms[module], perm)
	}

	// Sort.
	var catalog []PermissionCatalog
	for module, perms := range modulePerms {
		sort.Strings(perms)
		catalog = append(catalog, PermissionCatalog{
			Module:      module,
			Permissions: perms,
		})
	}
	sort.Slice(catalog, func(i, j int) bool {
		return catalog[i].Module < catalog[j].Module
	})

	return catalog, nil
}

// CountUsersByRole returns role → user count mappings.
func (s *RoleService) CountUsersByRole(ctx context.Context) ([]map[string]any, error) {
	query := `
		SELECT r.id, r.name, COUNT(rb.id) AS user_count
		FROM roles r
		LEFT JOIN role_bindings rb ON rb.role_id = r.id AND rb.is_active = true
		GROUP BY r.id, r.name
		ORDER BY user_count DESC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("count users by role: %w", err)
	}
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var id uuid.UUID
		var name string
		var count int64
		if err := rows.Scan(&id, &name, &count); err != nil {
			return nil, err
		}
		results = append(results, map[string]any{
			"id":        id,
			"name":      name,
			"userCount": count,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if results == nil {
		results = []map[string]any{}
	}
	return results, nil
}

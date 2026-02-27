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
// TenantService
// ──────────────────────────────────────────────

// TenantService handles business logic for tenant management.
type TenantService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewTenantService creates a new TenantService.
func NewTenantService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *TenantService {
	return &TenantService{pool: pool, auditSvc: auditSvc}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

func scanTenantDetail(row pgx.Row) (TenantDetail, error) {
	var t TenantDetail
	err := row.Scan(
		&t.ID, &t.Name, &t.Code, &t.Type, &t.ParentID,
		&t.ParentName, &t.IsActive, &t.Config,
		&t.CreatedAt, &t.UpdatedAt, &t.UserCount,
	)
	return t, err
}

func scanTenantDetails(rows pgx.Rows) ([]TenantDetail, error) {
	var tenants []TenantDetail
	for rows.Next() {
		var t TenantDetail
		if err := rows.Scan(
			&t.ID, &t.Name, &t.Code, &t.Type, &t.ParentID,
			&t.ParentName, &t.IsActive, &t.Config,
			&t.CreatedAt, &t.UpdatedAt, &t.UserCount,
		); err != nil {
			return nil, err
		}
		tenants = append(tenants, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tenants == nil {
		tenants = []TenantDetail{}
	}
	return tenants, nil
}

func scanTenantSummaries(rows pgx.Rows) ([]TenantSummary, error) {
	var summaries []TenantSummary
	for rows.Next() {
		var s TenantSummary
		if err := rows.Scan(
			&s.ID, &s.Name, &s.Code, &s.Type, &s.IsActive, &s.UserCount,
		); err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if summaries == nil {
		summaries = []TenantSummary{}
	}
	return summaries, nil
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────

// ListTenants returns all tenants with user counts.
func (s *TenantService) ListTenants(ctx context.Context) ([]TenantDetail, error) {
	query := `
		SELECT t.id, t.name, t.code, t.type::text, t.parent_id,
		       COALESCE(p.name, '') AS parent_name,
		       t.is_active, t.config, t.created_at, t.updated_at,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
		FROM tenants t
		LEFT JOIN tenants p ON p.id = t.parent_id
		ORDER BY t.name ASC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list tenants: %w", err)
	}
	defer rows.Close()

	return scanTenantDetails(rows)
}

// GetTenant returns a single tenant with children.
func (s *TenantService) GetTenant(ctx context.Context, tenantID uuid.UUID) (*TenantDetail, error) {
	query := `
		SELECT t.id, t.name, t.code, t.type::text, t.parent_id,
		       COALESCE(p.name, '') AS parent_name,
		       t.is_active, t.config, t.created_at, t.updated_at,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
		FROM tenants t
		LEFT JOIN tenants p ON p.id = t.parent_id
		WHERE t.id = $1`

	tenant, err := scanTenantDetail(s.pool.QueryRow(ctx, query, tenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("tenant", tenantID.String())
		}
		return nil, fmt.Errorf("get tenant: %w", err)
	}

	// Fetch children.
	childRows, err := s.pool.Query(ctx, `
		SELECT t.id, t.name, t.code, t.type::text, t.is_active,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
		FROM tenants t
		WHERE t.parent_id = $1
		ORDER BY t.name ASC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get tenant children: %w", err)
	}
	defer childRows.Close()

	children, err := scanTenantSummaries(childRows)
	if err != nil {
		return nil, fmt.Errorf("scan tenant children: %w", err)
	}
	tenant.Children = children

	return &tenant, nil
}

// CreateTenant creates a new tenant.
func (s *TenantService) CreateTenant(ctx context.Context, req CreateTenantRequest) (*TenantDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	// Validations.
	if req.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}
	if len(req.Name) < 2 || len(req.Name) > 100 {
		return nil, apperrors.BadRequest("name must be between 2 and 100 characters")
	}
	if req.Code == "" {
		return nil, apperrors.BadRequest("code is required")
	}
	if len(req.Code) < 2 || len(req.Code) > 20 {
		return nil, apperrors.BadRequest("code must be between 2 and 20 characters")
	}
	if req.Type == "" {
		return nil, apperrors.BadRequest("type is required")
	}
	if req.Type != "department" && req.Type != "division" && req.Type != "office" {
		return nil, apperrors.BadRequest("type must be one of: department, division, office")
	}

	// Check for duplicate code.
	var existingID uuid.UUID
	err := s.pool.QueryRow(ctx, "SELECT id FROM tenants WHERE code = $1", req.Code).Scan(&existingID)
	if err == nil {
		return nil, apperrors.Conflict("tenant with code '" + req.Code + "' already exists")
	}
	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("check tenant code: %w", err)
	}

	// Validate parent exists if specified.
	if req.ParentID != nil {
		var parentExists bool
		err = s.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM tenants WHERE id = $1)", *req.ParentID).Scan(&parentExists)
		if err != nil {
			return nil, fmt.Errorf("check parent tenant: %w", err)
		}
		if !parentExists {
			return nil, apperrors.BadRequest("parent tenant not found")
		}
	}

	configJSON := req.Config
	if configJSON == nil {
		configJSON = json.RawMessage(`{}`)
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO tenants (name, code, type, parent_id, config)
		VALUES ($1, $2, $3::tenant_type, $4, $5)
		RETURNING id, name, code, type::text, parent_id, is_active, config, created_at, updated_at`,
		req.Name, req.Code, req.Type, req.ParentID, configJSON,
	)

	var t TenantDetail
	err = row.Scan(&t.ID, &t.Name, &t.Code, &t.Type, &t.ParentID, &t.IsActive, &t.Config, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create tenant: %w", err)
	}
	t.UserCount = 0
	t.Children = []TenantSummary{}

	changes, _ := json.Marshal(req)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "tenant.created",
		EntityType:    "tenant",
		EntityID:      t.ID,
		Changes:       changes,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return &t, nil
}

// UpdateTenant updates a tenant's name, config, or active status.
func (s *TenantService) UpdateTenant(ctx context.Context, tenantID uuid.UUID, req UpdateTenantRequest) (*TenantDetail, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	name := ""
	if req.Name != nil {
		name = *req.Name
	}

	updateConfig := req.Config != nil
	var configJSON json.RawMessage
	if updateConfig {
		configJSON = *req.Config
	}

	updateActive := req.IsActive != nil
	isActive := false
	if updateActive {
		isActive = *req.IsActive
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE tenants SET
		  name = COALESCE(NULLIF($2, ''), name),
		  config = CASE WHEN $3::boolean THEN $4 ELSE config END,
		  is_active = CASE WHEN $5::boolean THEN $6 ELSE is_active END
		WHERE id = $1`,
		tenantID, name, updateConfig, configJSON, updateActive, isActive,
	)
	if err != nil {
		return nil, fmt.Errorf("update tenant: %w", err)
	}

	changes, _ := json.Marshal(req)
	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "tenant.updated",
		EntityType:    "tenant",
		EntityID:      tenantID,
		Changes:       changes,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return s.GetTenant(ctx, tenantID)
}

// DeactivateTenant deactivates a tenant and its child tenants.
func (s *TenantService) DeactivateTenant(ctx context.Context, tenantID uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	existing, err := s.GetTenant(ctx, tenantID)
	if err != nil {
		return err
	}

	// Prevent deactivating own tenant.
	if tenantID == auth.TenantID {
		return apperrors.Forbidden("cannot deactivate your own tenant")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Deactivate the tenant.
	_, err = tx.Exec(ctx, "UPDATE tenants SET is_active = false WHERE id = $1", tenantID)
	if err != nil {
		return fmt.Errorf("deactivate tenant: %w", err)
	}

	// Cascade deactivate child tenants.
	_, err = tx.Exec(ctx, "UPDATE tenants SET is_active = false WHERE parent_id = $1", tenantID)
	if err != nil {
		return fmt.Errorf("deactivate child tenants: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	prev, _ := json.Marshal(existing)
	_ = s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:      auth.TenantID,
		ActorID:       auth.UserID,
		ActorRole:     firstRole(auth.Roles),
		Action:        "tenant.deactivated",
		EntityType:    "tenant",
		EntityID:      tenantID,
		PreviousState: prev,
		CorrelationID: types.GetCorrelationID(ctx),
	})

	return nil
}

// GetTenantHierarchy returns all tenants structured as a tree.
func (s *TenantService) GetTenantHierarchy(ctx context.Context) ([]TenantSummary, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT t.id, t.name, t.code, t.type::text, t.parent_id, t.is_active,
		       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
		FROM tenants t
		ORDER BY t.parent_id NULLS FIRST, t.name ASC`)
	if err != nil {
		return nil, fmt.Errorf("get tenant hierarchy: %w", err)
	}
	defer rows.Close()

	type tenantNode struct {
		TenantSummary
		ParentID *uuid.UUID
	}

	var nodes []tenantNode
	for rows.Next() {
		var n tenantNode
		if err := rows.Scan(&n.ID, &n.Name, &n.Code, &n.Type, &n.ParentID, &n.IsActive, &n.UserCount); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Build flat list (tree building is done by the frontend).
	var result []TenantSummary
	for _, n := range nodes {
		result = append(result, n.TenantSummary)
	}
	if result == nil {
		result = []TenantSummary{}
	}
	return result, nil
}

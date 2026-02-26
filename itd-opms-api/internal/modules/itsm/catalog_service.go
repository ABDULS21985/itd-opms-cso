package itsm

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/itd-cbn/itd-opms-api/internal/platform/audit"
	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// CatalogService
// ──────────────────────────────────────────────

// CatalogService handles business logic for the service catalog (categories and items).
type CatalogService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewCatalogService creates a new CatalogService.
func NewCatalogService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *CatalogService {
	return &CatalogService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────

// CreateCategory creates a new catalog category.
func (s *CatalogService) CreateCategory(ctx context.Context, req CreateCatalogCategoryRequest) (CatalogCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CatalogCategory{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	query := `
		INSERT INTO catalog_categories (
			id, tenant_id, name, description, icon,
			parent_id, sort_order, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)
		RETURNING id, tenant_id, name, description, icon,
			parent_id, sort_order, created_at, updated_at`

	var cat CatalogCategory
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.Icon,
		req.ParentID, sortOrder, now, now,
	).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.Icon,
		&cat.ParentID, &cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		return CatalogCategory{}, apperrors.Internal("failed to create catalog category", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":       req.Name,
		"sort_order": sortOrder,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:catalog_category",
		EntityType: "catalog_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cat, nil
}

// GetCategory retrieves a single catalog category by ID.
func (s *CatalogService) GetCategory(ctx context.Context, id uuid.UUID) (CatalogCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CatalogCategory{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, icon,
			parent_id, sort_order, created_at, updated_at
		FROM catalog_categories
		WHERE id = $1 AND tenant_id = $2`

	var cat CatalogCategory
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.Icon,
		&cat.ParentID, &cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return CatalogCategory{}, apperrors.NotFound("CatalogCategory", id.String())
		}
		return CatalogCategory{}, apperrors.Internal("failed to get catalog category", err)
	}

	return cat, nil
}

// ListCategories returns catalog categories, optionally filtered by parent.
func (s *CatalogService) ListCategories(ctx context.Context, parentID *uuid.UUID) ([]CatalogCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, icon,
			parent_id, sort_order, created_at, updated_at
		FROM catalog_categories
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR parent_id = $2)
		ORDER BY sort_order ASC, name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, parentID)
	if err != nil {
		return nil, apperrors.Internal("failed to list catalog categories", err)
	}
	defer rows.Close()

	var categories []CatalogCategory
	for rows.Next() {
		var cat CatalogCategory
		if err := rows.Scan(
			&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.Icon,
			&cat.ParentID, &cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan catalog category", err)
		}
		categories = append(categories, cat)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate catalog categories", err)
	}

	if categories == nil {
		categories = []CatalogCategory{}
	}

	return categories, nil
}

// UpdateCategory updates an existing catalog category using COALESCE partial update.
func (s *CatalogService) UpdateCategory(ctx context.Context, id uuid.UUID, req UpdateCatalogCategoryRequest) (CatalogCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CatalogCategory{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the category exists and belongs to the tenant.
	_, err := s.GetCategory(ctx, id)
	if err != nil {
		return CatalogCategory{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE catalog_categories SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			icon = COALESCE($3, icon),
			parent_id = COALESCE($4, parent_id),
			sort_order = COALESCE($5, sort_order),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, name, description, icon,
			parent_id, sort_order, created_at, updated_at`

	var cat CatalogCategory
	err = s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.Icon,
		req.ParentID, req.SortOrder,
		now, id, auth.TenantID,
	).Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.Icon,
		&cat.ParentID, &cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		return CatalogCategory{}, apperrors.Internal("failed to update catalog category", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:catalog_category",
		EntityType: "catalog_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cat, nil
}

// DeleteCategory deletes a catalog category by ID.
func (s *CatalogService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM catalog_categories WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete catalog category", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CatalogCategory", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:catalog_category",
		EntityType: "catalog_category",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// Catalog Items
// ──────────────────────────────────────────────

// CreateItem creates a new catalog item.
func (s *CatalogService) CreateItem(ctx context.Context, req CreateCatalogItemRequest) (CatalogItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CatalogItem{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	status := "active"
	if req.Status != nil {
		status = *req.Status
	}

	approvalRequired := false
	if req.ApprovalRequired != nil {
		approvalRequired = *req.ApprovalRequired
	}

	query := `
		INSERT INTO catalog_items (
			id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11,
			$12, $13, $14,
			$15, $16
		)
		RETURNING id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at`

	var item CatalogItem
	err := s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.CategoryID, req.Name, req.Description,
		req.FulfillmentWorkflowID, approvalRequired, req.ApprovalChainConfig,
		req.SLAPolicyID, req.FormSchema, req.EntitlementRoles,
		req.EstimatedDelivery, status, 1,
		now, now,
	).Scan(
		&item.ID, &item.TenantID, &item.CategoryID, &item.Name, &item.Description,
		&item.FulfillmentWorkflowID, &item.ApprovalRequired, &item.ApprovalChainConfig,
		&item.SLAPolicyID, &item.FormSchema, &item.EntitlementRoles,
		&item.EstimatedDelivery, &item.Status, &item.Version,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return CatalogItem{}, apperrors.Internal("failed to create catalog item", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"name":   req.Name,
		"status": status,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:catalog_item",
		EntityType: "catalog_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// GetItem retrieves a single catalog item by ID.
func (s *CatalogService) GetItem(ctx context.Context, id uuid.UUID) (CatalogItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CatalogItem{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at
		FROM catalog_items
		WHERE id = $1 AND tenant_id = $2`

	var item CatalogItem
	err := s.pool.QueryRow(ctx, query, id, auth.TenantID).Scan(
		&item.ID, &item.TenantID, &item.CategoryID, &item.Name, &item.Description,
		&item.FulfillmentWorkflowID, &item.ApprovalRequired, &item.ApprovalChainConfig,
		&item.SLAPolicyID, &item.FormSchema, &item.EntitlementRoles,
		&item.EstimatedDelivery, &item.Status, &item.Version,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return CatalogItem{}, apperrors.NotFound("CatalogItem", id.String())
		}
		return CatalogItem{}, apperrors.Internal("failed to get catalog item", err)
	}

	return item, nil
}

// ListItems returns a filtered, paginated list of catalog items.
func (s *CatalogService) ListItems(ctx context.Context, categoryID *uuid.UUID, status *string, limit, offset int) ([]CatalogItem, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Count total matching records.
	countQuery := `
		SELECT COUNT(*)
		FROM catalog_items
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)
			AND ($3::text IS NULL OR status = $3)`

	var total int64
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, categoryID, status).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count catalog items", err)
	}

	// Fetch paginated results.
	dataQuery := `
		SELECT id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at
		FROM catalog_items
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)
			AND ($3::text IS NULL OR status = $3)
		ORDER BY name ASC
		LIMIT $4 OFFSET $5`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, categoryID, status, limit, offset)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list catalog items", err)
	}
	defer rows.Close()

	var items []CatalogItem
	for rows.Next() {
		var item CatalogItem
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.CategoryID, &item.Name, &item.Description,
			&item.FulfillmentWorkflowID, &item.ApprovalRequired, &item.ApprovalChainConfig,
			&item.SLAPolicyID, &item.FormSchema, &item.EntitlementRoles,
			&item.EstimatedDelivery, &item.Status, &item.Version,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan catalog item", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate catalog items", err)
	}

	if items == nil {
		items = []CatalogItem{}
	}

	return items, total, nil
}

// UpdateItem updates an existing catalog item using COALESCE partial update.
func (s *CatalogService) UpdateItem(ctx context.Context, id uuid.UUID, req UpdateCatalogItemRequest) (CatalogItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return CatalogItem{}, apperrors.Unauthorized("authentication required")
	}

	// Verify the item exists and belongs to the tenant.
	_, err := s.GetItem(ctx, id)
	if err != nil {
		return CatalogItem{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE catalog_items SET
			category_id = COALESCE($1, category_id),
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			fulfillment_workflow_id = COALESCE($4, fulfillment_workflow_id),
			approval_required = COALESCE($5, approval_required),
			approval_chain_config = COALESCE($6, approval_chain_config),
			sla_policy_id = COALESCE($7, sla_policy_id),
			form_schema = COALESCE($8, form_schema),
			entitlement_roles = COALESCE($9, entitlement_roles),
			estimated_delivery = COALESCE($10, estimated_delivery),
			status = COALESCE($11, status),
			version = version + 1,
			updated_at = $12
		WHERE id = $13 AND tenant_id = $14
		RETURNING id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at`

	var item CatalogItem
	err = s.pool.QueryRow(ctx, updateQuery,
		req.CategoryID, req.Name, req.Description,
		req.FulfillmentWorkflowID, req.ApprovalRequired, req.ApprovalChainConfig,
		req.SLAPolicyID, req.FormSchema, req.EntitlementRoles,
		req.EstimatedDelivery, req.Status,
		now, id, auth.TenantID,
	).Scan(
		&item.ID, &item.TenantID, &item.CategoryID, &item.Name, &item.Description,
		&item.FulfillmentWorkflowID, &item.ApprovalRequired, &item.ApprovalChainConfig,
		&item.SLAPolicyID, &item.FormSchema, &item.EntitlementRoles,
		&item.EstimatedDelivery, &item.Status, &item.Version,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return CatalogItem{}, apperrors.Internal("failed to update catalog item", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:catalog_item",
		EntityType: "catalog_item",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return item, nil
}

// DeleteItem deletes a catalog item by ID.
func (s *CatalogService) DeleteItem(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM catalog_items WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete catalog item", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("CatalogItem", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:catalog_item",
		EntityType: "catalog_item",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ListItemsByEntitlement returns active catalog items whose entitlement_roles
// overlap with the given set of roles.
func (s *CatalogService) ListItemsByEntitlement(ctx context.Context, roles []string) ([]CatalogItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at
		FROM catalog_items
		WHERE tenant_id = $1
			AND status = 'active'
			AND (entitlement_roles IS NULL OR entitlement_roles = '{}' OR entitlement_roles && $2)
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, roles)
	if err != nil {
		return nil, apperrors.Internal("failed to list entitled catalog items", err)
	}
	defer rows.Close()

	var items []CatalogItem
	for rows.Next() {
		var item CatalogItem
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.CategoryID, &item.Name, &item.Description,
			&item.FulfillmentWorkflowID, &item.ApprovalRequired, &item.ApprovalChainConfig,
			&item.SLAPolicyID, &item.FormSchema, &item.EntitlementRoles,
			&item.EstimatedDelivery, &item.Status, &item.Version,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan entitled catalog item", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate entitled catalog items", err)
	}

	if items == nil {
		items = []CatalogItem{}
	}

	return items, nil
}

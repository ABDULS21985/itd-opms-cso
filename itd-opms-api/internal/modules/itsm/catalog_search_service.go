package itsm

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/itd-cbn/itd-opms-api/internal/shared/errors"
	"github.com/itd-cbn/itd-opms-api/internal/shared/types"
)

// ──────────────────────────────────────────────
// CatalogSearchService
// ──────────────────────────────────────────────

// CatalogSearchService handles full-text search, favorites, and popularity
// queries for the service catalog.
type CatalogSearchService struct {
	pool *pgxpool.Pool
}

// NewCatalogSearchService creates a new CatalogSearchService.
func NewCatalogSearchService(pool *pgxpool.Pool) *CatalogSearchService {
	return &CatalogSearchService{pool: pool}
}

// ──────────────────────────────────────────────
// Full-text search
// ──────────────────────────────────────────────

// SearchItems performs a full-text search across catalog items using
// PostgreSQL's tsvector / tsquery. Results are filtered by tenant, active
// status, optional category IDs, optional approval_required flag, and
// entitlement roles. Results are ranked by relevance and paginated.
func (s *CatalogSearchService) SearchItems(
	ctx context.Context,
	query string,
	categoryIDs []uuid.UUID,
	approvalRequired *bool,
	limit, offset int,
) ([]CatalogItem, int64, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	if strings.TrimSpace(query) == "" {
		return []CatalogItem{}, 0, nil
	}

	// Build dynamic WHERE clauses.
	args := []any{auth.TenantID, query, auth.Roles}
	argIdx := 4

	var extraClauses []string

	if len(categoryIDs) > 0 {
		extraClauses = append(extraClauses, fmt.Sprintf("AND category_id = ANY($%d)", argIdx))
		args = append(args, categoryIDs)
		argIdx++
	}

	if approvalRequired != nil {
		extraClauses = append(extraClauses, fmt.Sprintf("AND approval_required = $%d", argIdx))
		args = append(args, *approvalRequired)
		argIdx++
	}

	extraWhere := strings.Join(extraClauses, " ")

	// Count total matching records.
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM service_catalog_items
		WHERE tenant_id = $1
			AND status = 'active'
			AND search_vector @@ plainto_tsquery('english', $2)
			AND (entitlement_roles IS NULL OR entitlement_roles = '{}' OR entitlement_roles && $3)
			%s`, extraWhere)

	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, apperrors.Internal("failed to count search results", err)
	}

	if total == 0 {
		return []CatalogItem{}, 0, nil
	}

	// Fetch paginated results ordered by relevance.
	dataQuery := fmt.Sprintf(`
		SELECT id, tenant_id, category_id, name, description,
			fulfillment_workflow_id, approval_required, approval_chain_config,
			sla_policy_id, form_schema, entitlement_roles,
			estimated_delivery, status, version,
			created_at, updated_at
		FROM service_catalog_items
		WHERE tenant_id = $1
			AND status = 'active'
			AND search_vector @@ plainto_tsquery('english', $2)
			AND (entitlement_roles IS NULL OR entitlement_roles = '{}' OR entitlement_roles && $3)
			%s
		ORDER BY ts_rank(search_vector, plainto_tsquery('english', $2)) DESC
		LIMIT $%d OFFSET $%d`, extraWhere, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to search catalog items", err)
	}
	defer rows.Close()

	items, err := scanCatalogItems(rows)
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

// ──────────────────────────────────────────────
// Favorites
// ──────────────────────────────────────────────

// ListFavorites returns the list of catalog item IDs that the current user
// has favorited.
func (s *CatalogSearchService) ListFavorites(ctx context.Context) ([]uuid.UUID, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT item_id
		FROM service_catalog_favorites
		WHERE tenant_id = $1 AND user_id = $2
		ORDER BY created_at DESC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, apperrors.Internal("failed to list favorites", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, apperrors.Internal("failed to scan favorite item id", err)
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate favorites", err)
	}

	if ids == nil {
		ids = []uuid.UUID{}
	}

	return ids, nil
}

// ToggleFavorite adds or removes a catalog item from the current user's
// favorites. It returns true if the item was added (favorited), or false if
// it was removed (unfavorited).
func (s *CatalogSearchService) ToggleFavorite(ctx context.Context, itemID uuid.UUID) (bool, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return false, apperrors.Unauthorized("authentication required")
	}

	// Verify the item exists and belongs to the tenant.
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM service_catalog_items WHERE id = $1 AND tenant_id = $2)`,
		itemID, auth.TenantID,
	).Scan(&exists)
	if err != nil {
		return false, apperrors.Internal("failed to verify catalog item", err)
	}
	if !exists {
		return false, apperrors.NotFound("CatalogItem", itemID.String())
	}

	// Try to delete the favorite first.
	result, err := s.pool.Exec(ctx,
		`DELETE FROM service_catalog_favorites WHERE tenant_id = $1 AND user_id = $2 AND item_id = $3`,
		auth.TenantID, auth.UserID, itemID,
	)
	if err != nil {
		return false, apperrors.Internal("failed to toggle favorite", err)
	}

	if result.RowsAffected() > 0 {
		// Was favorited, now removed.
		return false, nil
	}

	// Did not exist, so insert it.
	_, err = s.pool.Exec(ctx,
		`INSERT INTO service_catalog_favorites (tenant_id, user_id, item_id) VALUES ($1, $2, $3)
		 ON CONFLICT (tenant_id, user_id, item_id) DO NOTHING`,
		auth.TenantID, auth.UserID, itemID,
	)
	if err != nil {
		return false, apperrors.Internal("failed to add favorite", err)
	}

	return true, nil
}

// ──────────────────────────────────────────────
// Popularity & recently requested
// ──────────────────────────────────────────────

// ListPopularItems returns the most requested catalog items using the
// materialized view mv_catalog_item_popularity, joined with
// service_catalog_items for full item data. Results are filtered by
// tenant and entitlement roles.
func (s *CatalogSearchService) ListPopularItems(ctx context.Context, limit int) ([]CatalogItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT ci.id, ci.tenant_id, ci.category_id, ci.name, ci.description,
			ci.fulfillment_workflow_id, ci.approval_required, ci.approval_chain_config,
			ci.sla_policy_id, ci.form_schema, ci.entitlement_roles,
			ci.estimated_delivery, ci.status, ci.version,
			ci.created_at, ci.updated_at
		FROM mv_catalog_item_popularity p
		JOIN service_catalog_items ci ON ci.id = p.item_id AND ci.tenant_id = p.tenant_id
		WHERE p.tenant_id = $1
			AND ci.status = 'active'
			AND (ci.entitlement_roles IS NULL OR ci.entitlement_roles = '{}' OR ci.entitlement_roles && $2)
		ORDER BY p.request_count DESC
		LIMIT $3`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, auth.Roles, limit)
	if err != nil {
		return nil, apperrors.Internal("failed to list popular catalog items", err)
	}
	defer rows.Close()

	items, err := scanCatalogItems(rows)
	if err != nil {
		return nil, err
	}

	return items, nil
}

// ListRecentlyRequested returns the most recently requested unique catalog
// items for the current user, joined with service_catalog_items for full
// item data. Uses DISTINCT ON to ensure each catalog item appears only once.
func (s *CatalogSearchService) ListRecentlyRequested(ctx context.Context, limit int) ([]CatalogItem, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT ci.id, ci.tenant_id, ci.category_id, ci.name, ci.description,
			ci.fulfillment_workflow_id, ci.approval_required, ci.approval_chain_config,
			ci.sla_policy_id, ci.form_schema, ci.entitlement_roles,
			ci.estimated_delivery, ci.status, ci.version,
			ci.created_at, ci.updated_at
		FROM (
			SELECT DISTINCT ON (sr.catalog_item_id)
				sr.catalog_item_id,
				sr.created_at AS request_created_at
			FROM service_requests sr
			WHERE sr.tenant_id = $1
				AND sr.requester_id = $2
			ORDER BY sr.catalog_item_id, sr.created_at DESC
		) recent
		JOIN service_catalog_items ci ON ci.id = recent.catalog_item_id AND ci.tenant_id = $1
		WHERE ci.status = 'active'
		ORDER BY recent.request_created_at DESC
		LIMIT $3`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, auth.UserID, limit)
	if err != nil {
		return nil, apperrors.Internal("failed to list recently requested catalog items", err)
	}
	defer rows.Close()

	items, err := scanCatalogItems(rows)
	if err != nil {
		return nil, err
	}

	return items, nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// scanCatalogItems scans rows into a slice of CatalogItem, returning an
// empty (non-nil) slice when there are no results.
func scanCatalogItems(rows pgx.Rows) ([]CatalogItem, error) {
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
			return nil, apperrors.Internal("failed to scan catalog item", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate catalog items", err)
	}

	if items == nil {
		items = []CatalogItem{}
	}

	return items, nil
}

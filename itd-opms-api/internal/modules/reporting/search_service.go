package reporting

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
// SearchService
// ──────────────────────────────────────────────

// SearchService provides global search and saved search management.
type SearchService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewSearchService creates a new SearchService.
func NewSearchService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *SearchService {
	return &SearchService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Global Search
// ──────────────────────────────────────────────

// searchEntityResult holds the results for a single entity type.
type searchEntityResult struct {
	Results []map[string]any `json:"results"`
	Count   int              `json:"count"`
}

// GlobalSearch searches across multiple entity tables using ILIKE and returns grouped results.
func (s *SearchService) GlobalSearch(ctx context.Context, query string, entityTypes []string, params types.PaginationParams) (map[string]any, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	if query == "" {
		return nil, apperrors.BadRequest("query parameter is required")
	}

	likePattern := "%" + query + "%"
	result := map[string]any{}

	// Define which entity types to search. If entityTypes is empty, search all.
	allTypes := map[string]bool{
		"tickets":  true,
		"articles": true,
		"assets":   true,
		"projects": true,
		"policies": true,
	}

	// If specific entity types were requested, filter to just those.
	if len(entityTypes) > 0 {
		allTypes = map[string]bool{}
		for _, et := range entityTypes {
			allTypes[et] = true
		}
	}

	// Search tickets.
	if allTypes["tickets"] {
		ticketResult, err := s.searchTickets(ctx, auth.TenantID, likePattern)
		if err != nil {
			slog.ErrorContext(ctx, "failed to search tickets", "error", err)
			result["tickets"] = searchEntityResult{Results: []map[string]any{}, Count: 0}
		} else {
			result["tickets"] = ticketResult
		}
	}

	// Search kb_articles.
	if allTypes["articles"] {
		articleResult, err := s.searchArticles(ctx, auth.TenantID, likePattern)
		if err != nil {
			slog.ErrorContext(ctx, "failed to search articles", "error", err)
			result["articles"] = searchEntityResult{Results: []map[string]any{}, Count: 0}
		} else {
			result["articles"] = articleResult
		}
	}

	// Search assets.
	if allTypes["assets"] {
		assetResult, err := s.searchAssets(ctx, auth.TenantID, likePattern)
		if err != nil {
			slog.ErrorContext(ctx, "failed to search assets", "error", err)
			result["assets"] = searchEntityResult{Results: []map[string]any{}, Count: 0}
		} else {
			result["assets"] = assetResult
		}
	}

	// Search projects.
	if allTypes["projects"] {
		projectResult, err := s.searchProjects(ctx, auth.TenantID, likePattern)
		if err != nil {
			slog.ErrorContext(ctx, "failed to search projects", "error", err)
			result["projects"] = searchEntityResult{Results: []map[string]any{}, Count: 0}
		} else {
			result["projects"] = projectResult
		}
	}

	// Search policies.
	if allTypes["policies"] {
		policyResult, err := s.searchPolicies(ctx, auth.TenantID, likePattern)
		if err != nil {
			slog.ErrorContext(ctx, "failed to search policies", "error", err)
			result["policies"] = searchEntityResult{Results: []map[string]any{}, Count: 0}
		} else {
			result["policies"] = policyResult
		}
	}

	return result, nil
}

// searchTickets searches the tickets table.
func (s *SearchService) searchTickets(ctx context.Context, tenantID uuid.UUID, pattern string) (searchEntityResult, error) {
	// Count total matches.
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM tickets
		WHERE tenant_id = $1
			AND (title ILIKE $2 OR description ILIKE $2)`,
		tenantID, pattern,
	).Scan(&count)
	if err != nil {
		return searchEntityResult{}, err
	}

	// Fetch top 5 results.
	rows, err := s.pool.Query(ctx, `
		SELECT id, ticket_number, title, status, priority, created_at
		FROM tickets
		WHERE tenant_id = $1
			AND (title ILIKE $2 OR description ILIKE $2)
		ORDER BY created_at DESC
		LIMIT 5`,
		tenantID, pattern,
	)
	if err != nil {
		return searchEntityResult{}, err
	}
	defer rows.Close()

	results := []map[string]any{}
	for rows.Next() {
		var (
			id           uuid.UUID
			ticketNumber string
			title        string
			status       string
			priority     string
			createdAt    time.Time
		)
		if err := rows.Scan(&id, &ticketNumber, &title, &status, &priority, &createdAt); err != nil {
			return searchEntityResult{}, err
		}
		results = append(results, map[string]any{
			"id":           id,
			"ticketNumber": ticketNumber,
			"title":        title,
			"status":       status,
			"priority":     priority,
			"createdAt":    createdAt,
			"entityType":   "ticket",
		})
	}

	if err := rows.Err(); err != nil {
		return searchEntityResult{}, err
	}

	return searchEntityResult{Results: results, Count: count}, nil
}

// searchArticles searches the kb_articles table.
func (s *SearchService) searchArticles(ctx context.Context, tenantID uuid.UUID, pattern string) (searchEntityResult, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM kb_articles
		WHERE tenant_id = $1
			AND status = 'published'
			AND (title ILIKE $2 OR content ILIKE $2)`,
		tenantID, pattern,
	).Scan(&count)
	if err != nil {
		return searchEntityResult{}, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, title, status, created_at
		FROM kb_articles
		WHERE tenant_id = $1
			AND status = 'published'
			AND (title ILIKE $2 OR content ILIKE $2)
		ORDER BY created_at DESC
		LIMIT 5`,
		tenantID, pattern,
	)
	if err != nil {
		return searchEntityResult{}, err
	}
	defer rows.Close()

	results := []map[string]any{}
	for rows.Next() {
		var (
			id        uuid.UUID
			title     string
			status    string
			createdAt time.Time
		)
		if err := rows.Scan(&id, &title, &status, &createdAt); err != nil {
			return searchEntityResult{}, err
		}
		results = append(results, map[string]any{
			"id":         id,
			"title":      title,
			"status":     status,
			"createdAt":  createdAt,
			"entityType": "article",
		})
	}

	if err := rows.Err(); err != nil {
		return searchEntityResult{}, err
	}

	return searchEntityResult{Results: results, Count: count}, nil
}

// searchAssets searches the assets table.
func (s *SearchService) searchAssets(ctx context.Context, tenantID uuid.UUID, pattern string) (searchEntityResult, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM assets
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR asset_tag ILIKE $2)`,
		tenantID, pattern,
	).Scan(&count)
	if err != nil {
		return searchEntityResult{}, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, name, asset_tag, asset_type, status, created_at
		FROM assets
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR asset_tag ILIKE $2)
		ORDER BY created_at DESC
		LIMIT 5`,
		tenantID, pattern,
	)
	if err != nil {
		return searchEntityResult{}, err
	}
	defer rows.Close()

	results := []map[string]any{}
	for rows.Next() {
		var (
			id        uuid.UUID
			name      string
			assetTag  string
			assetType string
			status    string
			createdAt time.Time
		)
		if err := rows.Scan(&id, &name, &assetTag, &assetType, &status, &createdAt); err != nil {
			return searchEntityResult{}, err
		}
		results = append(results, map[string]any{
			"id":         id,
			"name":       name,
			"assetTag":   assetTag,
			"assetType":  assetType,
			"status":     status,
			"createdAt":  createdAt,
			"entityType": "asset",
		})
	}

	if err := rows.Err(); err != nil {
		return searchEntityResult{}, err
	}

	return searchEntityResult{Results: results, Count: count}, nil
}

// searchProjects searches the projects table.
func (s *SearchService) searchProjects(ctx context.Context, tenantID uuid.UUID, pattern string) (searchEntityResult, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM projects
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR description ILIKE $2)`,
		tenantID, pattern,
	).Scan(&count)
	if err != nil {
		return searchEntityResult{}, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, name, status, priority, created_at
		FROM projects
		WHERE tenant_id = $1
			AND (name ILIKE $2 OR description ILIKE $2)
		ORDER BY created_at DESC
		LIMIT 5`,
		tenantID, pattern,
	)
	if err != nil {
		return searchEntityResult{}, err
	}
	defer rows.Close()

	results := []map[string]any{}
	for rows.Next() {
		var (
			id        uuid.UUID
			name      string
			status    string
			priority  string
			createdAt time.Time
		)
		if err := rows.Scan(&id, &name, &status, &priority, &createdAt); err != nil {
			return searchEntityResult{}, err
		}
		results = append(results, map[string]any{
			"id":         id,
			"name":       name,
			"status":     status,
			"priority":   priority,
			"createdAt":  createdAt,
			"entityType": "project",
		})
	}

	if err := rows.Err(); err != nil {
		return searchEntityResult{}, err
	}

	return searchEntityResult{Results: results, Count: count}, nil
}

// searchPolicies searches the policies table.
func (s *SearchService) searchPolicies(ctx context.Context, tenantID uuid.UUID, pattern string) (searchEntityResult, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM policies
		WHERE tenant_id = $1
			AND title ILIKE $2`,
		tenantID, pattern,
	).Scan(&count)
	if err != nil {
		return searchEntityResult{}, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, title, status, created_at
		FROM policies
		WHERE tenant_id = $1
			AND title ILIKE $2
		ORDER BY created_at DESC
		LIMIT 5`,
		tenantID, pattern,
	)
	if err != nil {
		return searchEntityResult{}, err
	}
	defer rows.Close()

	results := []map[string]any{}
	for rows.Next() {
		var (
			id        uuid.UUID
			title     string
			status    string
			createdAt time.Time
		)
		if err := rows.Scan(&id, &title, &status, &createdAt); err != nil {
			return searchEntityResult{}, err
		}
		results = append(results, map[string]any{
			"id":         id,
			"title":      title,
			"status":     status,
			"createdAt":  createdAt,
			"entityType": "policy",
		})
	}

	if err := rows.Err(); err != nil {
		return searchEntityResult{}, err
	}

	return searchEntityResult{Results: results, Count: count}, nil
}

// ──────────────────────────────────────────────
// Saved Search CRUD
// ──────────────────────────────────────────────

const savedSearchColumns = `
	id, tenant_id, user_id, query,
	entity_types, is_saved, last_used_at, created_at`

func scanSavedSearch(row pgx.Row) (SavedSearch, error) {
	var ss SavedSearch
	err := row.Scan(
		&ss.ID, &ss.TenantID, &ss.UserID, &ss.Query,
		&ss.EntityTypes, &ss.IsSaved, &ss.LastUsedAt, &ss.CreatedAt,
	)
	return ss, err
}

// SaveSearch creates or updates a saved/recent search record.
func (s *SearchService) SaveSearch(ctx context.Context, req CreateSavedSearchRequest) (SavedSearch, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return SavedSearch{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	entityTypes := req.EntityTypes
	if entityTypes == nil {
		entityTypes = []string{}
	}

	query := `
		INSERT INTO saved_searches (
			id, tenant_id, user_id, query,
			entity_types, is_saved, last_used_at, created_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8
		)
		RETURNING ` + savedSearchColumns

	ss, err := scanSavedSearch(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, auth.UserID, req.Query,
		entityTypes, req.IsSaved, now, now,
	))
	if err != nil {
		return SavedSearch{}, apperrors.Internal("failed to save search", err)
	}

	// Log audit event.
	changes, _ := json.Marshal(map[string]any{
		"query":    req.Query,
		"is_saved": req.IsSaved,
	})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:saved_search",
		EntityType: "saved_search",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return ss, nil
}

// ListRecentSearches returns the last 10 searches by the current user (saved and recent).
func (s *SearchService) ListRecentSearches(ctx context.Context) ([]SavedSearch, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT `+savedSearchColumns+`
		FROM saved_searches
		WHERE tenant_id = $1
			AND user_id = $2
		ORDER BY last_used_at DESC
		LIMIT 10`,
		auth.TenantID, auth.UserID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list recent searches", err)
	}
	defer rows.Close()

	var searches []SavedSearch
	for rows.Next() {
		var ss SavedSearch
		if err := rows.Scan(
			&ss.ID, &ss.TenantID, &ss.UserID, &ss.Query,
			&ss.EntityTypes, &ss.IsSaved, &ss.LastUsedAt, &ss.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan saved search", err)
		}
		searches = append(searches, ss)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate saved searches", err)
	}

	if searches == nil {
		searches = []SavedSearch{}
	}

	return searches, nil
}

// ListSavedSearches returns the user's explicitly saved searches.
func (s *SearchService) ListSavedSearches(ctx context.Context) ([]SavedSearch, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	rows, err := s.pool.Query(ctx, `
		SELECT `+savedSearchColumns+`
		FROM saved_searches
		WHERE tenant_id = $1
			AND user_id = $2
			AND is_saved = true
		ORDER BY last_used_at DESC`,
		auth.TenantID, auth.UserID,
	)
	if err != nil {
		return nil, apperrors.Internal("failed to list saved searches", err)
	}
	defer rows.Close()

	var searches []SavedSearch
	for rows.Next() {
		var ss SavedSearch
		if err := rows.Scan(
			&ss.ID, &ss.TenantID, &ss.UserID, &ss.Query,
			&ss.EntityTypes, &ss.IsSaved, &ss.LastUsedAt, &ss.CreatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan saved search", err)
		}
		searches = append(searches, ss)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate saved searches", err)
	}

	if searches == nil {
		searches = []SavedSearch{}
	}

	return searches, nil
}

// DeleteSavedSearch removes a saved search by ID.
func (s *SearchService) DeleteSavedSearch(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	result, err := s.pool.Exec(ctx, `
		DELETE FROM saved_searches
		WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
		id, auth.TenantID, auth.UserID,
	)
	if err != nil {
		return apperrors.Internal("failed to delete saved search", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("SavedSearch", id.String())
	}

	// Log audit event.
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:saved_search",
		EntityType: "saved_search",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

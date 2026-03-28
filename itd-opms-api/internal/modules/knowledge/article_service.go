package knowledge

import (
	"context"
	"encoding/json"
	"fmt"
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
// ArticleService
// ──────────────────────────────────────────────

// ArticleService handles business logic for KB categories and articles.
type ArticleService struct {
	pool     *pgxpool.Pool
	auditSvc *audit.AuditService
}

// NewArticleService creates a new ArticleService.
func NewArticleService(pool *pgxpool.Pool, auditSvc *audit.AuditService) *ArticleService {
	return &ArticleService{
		pool:     pool,
		auditSvc: auditSvc,
	}
}

// ──────────────────────────────────────────────
// Scan helpers
// ──────────────────────────────────────────────

// scanCategory scans a single KBCategory from a pgx.Row.
func scanCategory(row pgx.Row) (KBCategory, error) {
	var cat KBCategory
	err := row.Scan(
		&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.ParentID,
		&cat.Icon, &cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt,
	)
	return cat, err
}

// scanArticle scans a single KBArticle (with enriched author/reviewer names) from a pgx.Row.
func scanArticle(row pgx.Row) (KBArticle, error) {
	var a KBArticle
	err := row.Scan(
		&a.ID, &a.TenantID, &a.CategoryID, &a.Title, &a.Slug,
		&a.Content, &a.Status, &a.Version, &a.Type, &a.Tags,
		&a.AuthorID, &a.ReviewerID, &a.PublishedAt,
		&a.ViewCount, &a.HelpfulCount, &a.NotHelpfulCount,
		&a.LinkedTicketIDs, &a.OrgUnitID, &a.CreatedAt, &a.UpdatedAt,
		&a.AuthorName, &a.ReviewerName,
	)
	return a, err
}

// scanArticleFromRows scans a KBArticle (with enriched names) from pgx.Rows.
func scanArticleFromRows(rows pgx.Rows) (KBArticle, error) {
	var a KBArticle
	err := rows.Scan(
		&a.ID, &a.TenantID, &a.CategoryID, &a.Title, &a.Slug,
		&a.Content, &a.Status, &a.Version, &a.Type, &a.Tags,
		&a.AuthorID, &a.ReviewerID, &a.PublishedAt,
		&a.ViewCount, &a.HelpfulCount, &a.NotHelpfulCount,
		&a.LinkedTicketIDs, &a.OrgUnitID, &a.CreatedAt, &a.UpdatedAt,
		&a.AuthorName, &a.ReviewerName,
	)
	return a, err
}

// ──────────────────────────────────────────────
// KB Categories
// ──────────────────────────────────────────────

// CreateCategory creates a new knowledge base category.
func (s *ArticleService) CreateCategory(ctx context.Context, req CreateKBCategoryRequest) (KBCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBCategory{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	query := `
		INSERT INTO kb_categories (
			id, tenant_id, name, description, parent_id,
			icon, sort_order, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9
		)
		RETURNING id, tenant_id, name, description, parent_id,
			icon, sort_order, created_at, updated_at`

	cat, err := scanCategory(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.Name, req.Description, req.ParentID,
		req.Icon, sortOrder, now, now,
	))
	if err != nil {
		return KBCategory{}, apperrors.Internal("failed to create KB category", err)
	}

	changes, _ := json.Marshal(map[string]any{"name": req.Name})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:kb_category",
		EntityType: "kb_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cat, nil
}

// GetCategory retrieves a single KB category by ID.
func (s *ArticleService) GetCategory(ctx context.Context, id uuid.UUID) (KBCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBCategory{}, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, parent_id,
			icon, sort_order, created_at, updated_at
		FROM kb_categories
		WHERE id = $1 AND tenant_id = $2`

	cat, err := scanCategory(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return KBCategory{}, apperrors.NotFound("KBCategory", id.String())
		}
		return KBCategory{}, apperrors.Internal("failed to get KB category", err)
	}

	return cat, nil
}

// ListCategories returns KB categories, optionally filtered by parent. No pagination (tree).
func (s *ArticleService) ListCategories(ctx context.Context, parentID *uuid.UUID) ([]KBCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, apperrors.Unauthorized("authentication required")
	}

	query := `
		SELECT id, tenant_id, name, description, parent_id,
			icon, sort_order, created_at, updated_at
		FROM kb_categories
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR parent_id = $2)
		ORDER BY sort_order ASC, name ASC`

	rows, err := s.pool.Query(ctx, query, auth.TenantID, parentID)
	if err != nil {
		return nil, apperrors.Internal("failed to list KB categories", err)
	}
	defer rows.Close()

	var categories []KBCategory
	for rows.Next() {
		var cat KBCategory
		if err := rows.Scan(
			&cat.ID, &cat.TenantID, &cat.Name, &cat.Description, &cat.ParentID,
			&cat.Icon, &cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt,
		); err != nil {
			return nil, apperrors.Internal("failed to scan KB category", err)
		}
		categories = append(categories, cat)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.Internal("failed to iterate KB categories", err)
	}

	if categories == nil {
		categories = []KBCategory{}
	}

	return categories, nil
}

// UpdateCategory updates an existing KB category using COALESCE partial update.
func (s *ArticleService) UpdateCategory(ctx context.Context, id uuid.UUID, req UpdateKBCategoryRequest) (KBCategory, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBCategory{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetCategory(ctx, id); err != nil {
		return KBCategory{}, err
	}

	now := time.Now().UTC()

	updateQuery := `
		UPDATE kb_categories SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			parent_id = COALESCE($3, parent_id),
			icon = COALESCE($4, icon),
			sort_order = COALESCE($5, sort_order),
			updated_at = $6
		WHERE id = $7 AND tenant_id = $8
		RETURNING id, tenant_id, name, description, parent_id,
			icon, sort_order, created_at, updated_at`

	cat, err := scanCategory(s.pool.QueryRow(ctx, updateQuery,
		req.Name, req.Description, req.ParentID,
		req.Icon, req.SortOrder,
		now, id, auth.TenantID,
	))
	if err != nil {
		return KBCategory{}, apperrors.Internal("failed to update KB category", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:kb_category",
		EntityType: "kb_category",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return cat, nil
}

// DeleteCategory deletes a KB category by ID.
func (s *ArticleService) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM kb_categories WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete KB category", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KBCategory", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:kb_category",
		EntityType: "kb_category",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// ──────────────────────────────────────────────
// KB Articles
// ──────────────────────────────────────────────

// articleSelect is the enriched SELECT column list for kb_articles, including author/reviewer names.
// Must be used together with articleFrom (which aliases kb_articles as "a" and LEFT JOINs users).
const articleSelect = `a.id, a.tenant_id, a.category_id, a.title, a.slug,
	a.content, a.status, a.version, a.type, a.tags,
	a.author_id, a.reviewer_id, a.published_at,
	a.view_count, a.helpful_count, a.not_helpful_count,
	a.linked_ticket_ids, a.org_unit_id, a.created_at, a.updated_at,
	COALESCE(u_a.display_name, a.author_id::text) AS author_name,
	u_r.display_name AS reviewer_name`

// articleFrom is the FROM + JOIN clause for enriched kb_articles queries.
const articleFrom = `FROM kb_articles a
	LEFT JOIN users u_a ON u_a.id = a.author_id
	LEFT JOIN users u_r ON u_r.id = a.reviewer_id`

// articleCTESelect is the enriched SELECT for use after a CTE that exposes all kb_articles columns.
const articleCTESelect = `SELECT cte.id, cte.tenant_id, cte.category_id, cte.title, cte.slug,
	cte.content, cte.status, cte.version, cte.type, cte.tags,
	cte.author_id, cte.reviewer_id, cte.published_at,
	cte.view_count, cte.helpful_count, cte.not_helpful_count,
	cte.linked_ticket_ids, cte.org_unit_id, cte.created_at, cte.updated_at,
	COALESCE(u_a.display_name, cte.author_id::text) AS author_name,
	u_r.display_name AS reviewer_name
FROM cte
LEFT JOIN users u_a ON u_a.id = cte.author_id
LEFT JOIN users u_r ON u_r.id = cte.reviewer_id`

// CreateArticle creates a new KB article.
func (s *ArticleService) CreateArticle(ctx context.Context, req CreateKBArticleRequest) (KBArticle, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticle{}, apperrors.Unauthorized("authentication required")
	}

	id := uuid.New()
	now := time.Now().UTC()

	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}

	// Derive org_unit_id from auth context; use NULL if not set.
	var orgUnitID *uuid.UUID
	if auth.OrgUnitID != uuid.Nil {
		oid := auth.OrgUnitID
		orgUnitID = &oid
	}

	query := `
		WITH cte AS (
			INSERT INTO kb_articles (
				id, tenant_id, category_id, title, slug,
				content, status, version, type, tags,
				author_id, view_count, helpful_count, not_helpful_count,
				linked_ticket_ids, org_unit_id, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5,
				$6, $7, $8, $9, $10,
				$11, $12, $13, $14,
				$15, $16, $17, $18
			)
			RETURNING *
		)
		` + articleCTESelect

	a, err := scanArticle(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.CategoryID, req.Title, req.Slug,
		req.Content, ArticleStatusDraft, 1, req.Type, tags,
		auth.UserID, 0, 0, 0,
		[]uuid.UUID{}, orgUnitID, now, now,
	))
	if err != nil {
		return KBArticle{}, apperrors.Internal("failed to create KB article", err)
	}

	changes, _ := json.Marshal(map[string]any{"title": req.Title, "slug": req.Slug, "type": req.Type})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "create:kb_article",
		EntityType: "kb_article",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// GetArticle retrieves a single KB article by ID.
func (s *ArticleService) GetArticle(ctx context.Context, id uuid.UUID) (KBArticle, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticle{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + articleSelect + ` ` + articleFrom + ` WHERE a.id = $1 AND a.tenant_id = $2`

	a, err := scanArticle(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return KBArticle{}, apperrors.NotFound("KBArticle", id.String())
		}
		return KBArticle{}, apperrors.Internal("failed to get KB article", err)
	}

	// Org-scope access check.
	if a.OrgUnitID != nil && !auth.HasOrgAccess(*a.OrgUnitID) {
		return KBArticle{}, apperrors.NotFound("KBArticle", id.String())
	}

	return a, nil
}

// GetArticleBySlug retrieves a single KB article by slug.
func (s *ArticleService) GetArticleBySlug(ctx context.Context, slug string) (KBArticle, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticle{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + articleSelect + ` ` + articleFrom + ` WHERE a.slug = $1 AND a.tenant_id = $2`

	a, err := scanArticle(s.pool.QueryRow(ctx, query, slug, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return KBArticle{}, apperrors.NotFound("KBArticle", slug)
		}
		return KBArticle{}, apperrors.Internal("failed to get KB article by slug", err)
	}

	// Org-scope access check.
	if a.OrgUnitID != nil && !auth.HasOrgAccess(*a.OrgUnitID) {
		return KBArticle{}, apperrors.NotFound("KBArticle", slug)
	}

	return a, nil
}

// ListArticles returns a filtered, paginated list of KB articles.
func (s *ArticleService) ListArticles(ctx context.Context, categoryID *uuid.UUID, status, articleType, authorID *string, params types.PaginationParams) ([]KBArticle, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clause.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 6)

	countQuery := `
		SELECT COUNT(*)
		FROM kb_articles
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR type = $4)
			AND ($5::text IS NULL OR author_id::text = $5)`

	countArgs := []interface{}{auth.TenantID, categoryID, status, articleType, authorID}
	if orgClause != "" {
		countQuery += ` AND ` + orgClause
		if orgParam != nil {
			countArgs = append(countArgs, orgParam)
		}
	}

	var total int
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count KB articles", err)
	}

	// Determine next param index after the org filter (if any).
	// Use qualified "a.org_unit_id" for the data query which JOINs the users table.
	orgDataClause, orgDataParam := types.BuildOrgFilter(auth, "a.org_unit_id", 6)
	nextIdx := 6
	if orgDataClause != "" && orgDataParam != nil {
		nextIdx = 7
	}

	dataQuery := fmt.Sprintf(`
		SELECT `+articleSelect+`
		`+articleFrom+`
		WHERE a.tenant_id = $1
			AND ($2::uuid IS NULL OR a.category_id = $2)
			AND ($3::text IS NULL OR a.status = $3)
			AND ($4::text IS NULL OR a.type = $4)
			AND ($5::text IS NULL OR a.author_id::text = $5)%s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgDataClause != "" {
				return " AND " + orgDataClause
			}
			return ""
		}(), nextIdx, nextIdx+1)

	dataArgs := []interface{}{auth.TenantID, categoryID, status, articleType, authorID}
	if orgDataClause != "" && orgDataParam != nil {
		dataArgs = append(dataArgs, orgDataParam)
	}
	dataArgs = append(dataArgs, params.Limit, params.Offset())

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list KB articles", err)
	}
	defer rows.Close()

	var articles []KBArticle
	for rows.Next() {
		article, err := scanArticleFromRows(rows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan KB article", err)
		}
		articles = append(articles, article)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate KB articles", err)
	}

	if articles == nil {
		articles = []KBArticle{}
	}

	return articles, total, nil
}

// UpdateArticle updates an existing KB article using COALESCE partial update.
func (s *ArticleService) UpdateArticle(ctx context.Context, id uuid.UUID, req UpdateKBArticleRequest) (KBArticle, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticle{}, apperrors.Unauthorized("authentication required")
	}

	if _, err := s.GetArticle(ctx, id); err != nil {
		return KBArticle{}, err
	}

	now := time.Now().UTC()

	// For tags: pass nil if not setting (lets CASE/COALESCE keep existing value).
	var tagsParam []string
	if len(req.Tags) > 0 {
		tagsParam = req.Tags
	}

	updateQuery := `
		WITH cte AS (
			UPDATE kb_articles SET
				category_id = COALESCE($1, category_id),
				title = COALESCE($2, title),
				slug = COALESCE($3, slug),
				content = COALESCE($4, content),
				type = COALESCE($5, type),
				tags = CASE WHEN $6::boolean THEN '{}'::text[] ELSE COALESCE($7, tags) END,
				reviewer_id = COALESCE($8, reviewer_id),
				updated_at = $9
			WHERE id = $10 AND tenant_id = $11
			RETURNING *
		)
		` + articleCTESelect

	a, err := scanArticle(s.pool.QueryRow(ctx, updateQuery,
		req.CategoryID, req.Title, req.Slug,
		req.Content, req.Type, req.ClearTags, tagsParam, req.ReviewerID,
		now, id, auth.TenantID,
	))
	if err != nil {
		return KBArticle{}, apperrors.Internal("failed to update KB article", err)
	}

	changes, _ := json.Marshal(req)
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "update:kb_article",
		EntityType: "kb_article",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// DeleteArticle deletes a KB article by ID.
func (s *ArticleService) DeleteArticle(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `DELETE FROM kb_articles WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to delete KB article", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KBArticle", id.String())
	}

	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "delete:kb_article",
		EntityType: "kb_article",
		EntityID:   id,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// PublishArticle publishes a KB article: saves a version snapshot, sets status to published.
func (s *ArticleService) PublishArticle(ctx context.Context, id uuid.UUID) (KBArticle, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticle{}, apperrors.Unauthorized("authentication required")
	}

	article, err := s.GetArticle(ctx, id)
	if err != nil {
		return KBArticle{}, err
	}

	now := time.Now().UTC()
	versionID := uuid.New()

	// Save version snapshot.
	versionQuery := `
		INSERT INTO kb_article_versions (
			id, tenant_id, article_id, version, content, changed_by, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)`

	_, err = s.pool.Exec(ctx, versionQuery,
		versionID, auth.TenantID, article.ID, article.Version, article.Content, auth.UserID, now,
	)
	if err != nil {
		return KBArticle{}, apperrors.Internal("failed to save article version", err)
	}

	// Update article status and increment version.
	publishQuery := `
		WITH cte AS (
			UPDATE kb_articles SET
				status = $1,
				version = version + 1,
				published_at = $2,
				updated_at = $3
			WHERE id = $4 AND tenant_id = $5
			RETURNING *
		)
		` + articleCTESelect

	a, err := scanArticle(s.pool.QueryRow(ctx, publishQuery,
		ArticleStatusPublished, now, now, id, auth.TenantID,
	))
	if err != nil {
		return KBArticle{}, apperrors.Internal("failed to publish KB article", err)
	}

	changes, _ := json.Marshal(map[string]any{"status": ArticleStatusPublished, "version": a.Version})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "publish:kb_article",
		EntityType: "kb_article",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return a, nil
}

// ArchiveArticle sets a KB article status to archived.
func (s *ArticleService) ArchiveArticle(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	now := time.Now().UTC()

	query := `
		UPDATE kb_articles SET
			status = $1,
			updated_at = $2
		WHERE id = $3 AND tenant_id = $4`

	result, err := s.pool.Exec(ctx, query, ArticleStatusArchived, now, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to archive KB article", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KBArticle", id.String())
	}

	changes, _ := json.Marshal(map[string]any{"status": ArticleStatusArchived})
	if auditErr := s.auditSvc.Log(ctx, audit.AuditEntry{
		TenantID:   auth.TenantID,
		ActorID:    auth.UserID,
		Action:     "archive:kb_article",
		EntityType: "kb_article",
		EntityID:   id,
		Changes:    changes,
	}); auditErr != nil {
		slog.ErrorContext(ctx, "failed to log audit event", "error", auditErr)
	}

	return nil
}

// IncrementViewCount increments the view count for a KB article.
func (s *ArticleService) IncrementViewCount(ctx context.Context, id uuid.UUID) error {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return apperrors.Unauthorized("authentication required")
	}

	query := `
		UPDATE kb_articles SET
			view_count = view_count + 1
		WHERE id = $1 AND tenant_id = $2`

	result, err := s.pool.Exec(ctx, query, id, auth.TenantID)
	if err != nil {
		return apperrors.Internal("failed to increment view count", err)
	}

	if result.RowsAffected() == 0 {
		return apperrors.NotFound("KBArticle", id.String())
	}

	return nil
}

// SearchArticles performs a full-text search across KB articles.
func (s *ArticleService) SearchArticles(ctx context.Context, query string, params types.PaginationParams) ([]KBArticle, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	// Build org-scope filter clause.
	orgClause, orgParam := types.BuildOrgFilter(auth, "org_unit_id", 3)

	countQuery := `
		SELECT COUNT(*)
		FROM kb_articles
		WHERE tenant_id = $1
			AND (
				title ILIKE '%' || $2 || '%'
				OR content ILIKE '%' || $2 || '%'
				OR $2 = ANY(tags)
			)`

	countArgs := []interface{}{auth.TenantID, query}
	if orgClause != "" {
		countQuery += ` AND ` + orgClause
		if orgParam != nil {
			countArgs = append(countArgs, orgParam)
		}
	}

	var total int
	err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count search results", err)
	}

	// Determine next param index after the org filter (if any).
	// Use qualified "a.org_unit_id" for the data query which JOINs the users table.
	orgDataClause, orgDataParam := types.BuildOrgFilter(auth, "a.org_unit_id", 3)
	nextIdx := 3
	if orgDataClause != "" && orgDataParam != nil {
		nextIdx = 4
	}

	dataQuery := fmt.Sprintf(`
		SELECT `+articleSelect+`
		`+articleFrom+`
		WHERE a.tenant_id = $1
			AND (
				a.title ILIKE '%%' || $2 || '%%'
				OR a.content ILIKE '%%' || $2 || '%%'
				OR $2 = ANY(a.tags)
			)%s
		ORDER BY
			CASE WHEN a.title ILIKE '%%' || $2 || '%%' THEN 0 ELSE 1 END,
			a.view_count DESC,
			a.created_at DESC
		LIMIT $%d OFFSET $%d`,
		func() string {
			if orgDataClause != "" {
				return " AND " + orgDataClause
			}
			return ""
		}(), nextIdx, nextIdx+1)

	dataArgs := []interface{}{auth.TenantID, query}
	if orgDataClause != "" && orgDataParam != nil {
		dataArgs = append(dataArgs, orgDataParam)
	}
	dataArgs = append(dataArgs, params.Limit, params.Offset())

	rows, err := s.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to search KB articles", err)
	}
	defer rows.Close()

	var articles []KBArticle
	for rows.Next() {
		article, err := scanArticleFromRows(rows)
		if err != nil {
			return nil, 0, apperrors.Internal("failed to scan search result", err)
		}
		articles = append(articles, article)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate search results", err)
	}

	if articles == nil {
		articles = []KBArticle{}
	}

	return articles, total, nil
}

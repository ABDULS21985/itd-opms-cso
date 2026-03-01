package knowledge

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

// scanArticle scans a single KBArticle from a pgx.Row.
func scanArticle(row pgx.Row) (KBArticle, error) {
	var a KBArticle
	err := row.Scan(
		&a.ID, &a.TenantID, &a.CategoryID, &a.Title, &a.Slug,
		&a.Content, &a.Status, &a.Version, &a.Type, &a.Tags,
		&a.AuthorID, &a.ReviewerID, &a.PublishedAt,
		&a.ViewCount, &a.HelpfulCount, &a.NotHelpfulCount,
		&a.LinkedTicketIDs, &a.CreatedAt, &a.UpdatedAt,
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

// articleColumns is the standard SELECT column list for kb_articles.
const articleColumns = `id, tenant_id, category_id, title, slug,
	content, status, version, type, tags,
	author_id, reviewer_id, published_at,
	view_count, helpful_count, not_helpful_count,
	linked_ticket_ids, created_at, updated_at`

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

	query := `
		INSERT INTO kb_articles (
			id, tenant_id, category_id, title, slug,
			content, status, version, type, tags,
			author_id, view_count, helpful_count, not_helpful_count,
			linked_ticket_ids, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17
		)
		RETURNING ` + articleColumns

	a, err := scanArticle(s.pool.QueryRow(ctx, query,
		id, auth.TenantID, req.CategoryID, req.Title, req.Slug,
		req.Content, ArticleStatusDraft, 1, req.Type, tags,
		auth.UserID, 0, 0, 0,
		[]uuid.UUID{}, now, now,
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

	query := `SELECT ` + articleColumns + ` FROM kb_articles WHERE id = $1 AND tenant_id = $2`

	a, err := scanArticle(s.pool.QueryRow(ctx, query, id, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return KBArticle{}, apperrors.NotFound("KBArticle", id.String())
		}
		return KBArticle{}, apperrors.Internal("failed to get KB article", err)
	}

	return a, nil
}

// GetArticleBySlug retrieves a single KB article by slug.
func (s *ArticleService) GetArticleBySlug(ctx context.Context, slug string) (KBArticle, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return KBArticle{}, apperrors.Unauthorized("authentication required")
	}

	query := `SELECT ` + articleColumns + ` FROM kb_articles WHERE slug = $1 AND tenant_id = $2`

	a, err := scanArticle(s.pool.QueryRow(ctx, query, slug, auth.TenantID))
	if err != nil {
		if err == pgx.ErrNoRows {
			return KBArticle{}, apperrors.NotFound("KBArticle", slug)
		}
		return KBArticle{}, apperrors.Internal("failed to get KB article by slug", err)
	}

	return a, nil
}

// ListArticles returns a filtered, paginated list of KB articles.
func (s *ArticleService) ListArticles(ctx context.Context, categoryID *uuid.UUID, status, articleType, authorID *string, params types.PaginationParams) ([]KBArticle, int, error) {
	auth := types.GetAuthContext(ctx)
	if auth == nil {
		return nil, 0, apperrors.Unauthorized("authentication required")
	}

	countQuery := `
		SELECT COUNT(*)
		FROM kb_articles
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR type = $4)
			AND ($5::text IS NULL OR author_id::text = $5)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, categoryID, status, articleType, authorID).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count KB articles", err)
	}

	dataQuery := `
		SELECT ` + articleColumns + `
		FROM kb_articles
		WHERE tenant_id = $1
			AND ($2::uuid IS NULL OR category_id = $2)
			AND ($3::text IS NULL OR status = $3)
			AND ($4::text IS NULL OR type = $4)
			AND ($5::text IS NULL OR author_id::text = $5)
		ORDER BY created_at DESC
		LIMIT $6 OFFSET $7`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, categoryID, status, articleType, authorID, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to list KB articles", err)
	}
	defer rows.Close()

	var articles []KBArticle
	for rows.Next() {
		var a KBArticle
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.CategoryID, &a.Title, &a.Slug,
			&a.Content, &a.Status, &a.Version, &a.Type, &a.Tags,
			&a.AuthorID, &a.ReviewerID, &a.PublishedAt,
			&a.ViewCount, &a.HelpfulCount, &a.NotHelpfulCount,
			&a.LinkedTicketIDs, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan KB article", err)
		}
		articles = append(articles, a)
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

	updateQuery := `
		UPDATE kb_articles SET
			category_id = COALESCE($1, category_id),
			title = COALESCE($2, title),
			slug = COALESCE($3, slug),
			content = COALESCE($4, content),
			type = COALESCE($5, type),
			tags = COALESCE($6, tags),
			reviewer_id = COALESCE($7, reviewer_id),
			updated_at = $8
		WHERE id = $9 AND tenant_id = $10
		RETURNING ` + articleColumns

	// For tags, pass nil if empty to let COALESCE keep existing value.
	var tagsParam []string
	if len(req.Tags) > 0 {
		tagsParam = req.Tags
	}

	a, err := scanArticle(s.pool.QueryRow(ctx, updateQuery,
		req.CategoryID, req.Title, req.Slug,
		req.Content, req.Type, tagsParam, req.ReviewerID,
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
			id, article_id, version, content, changed_by, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6
		)`

	_, err = s.pool.Exec(ctx, versionQuery,
		versionID, article.ID, article.Version, article.Content, auth.UserID, now,
	)
	if err != nil {
		return KBArticle{}, apperrors.Internal("failed to save article version", err)
	}

	// Update article status and increment version.
	publishQuery := `
		UPDATE kb_articles SET
			status = $1,
			version = version + 1,
			published_at = $2,
			updated_at = $3
		WHERE id = $4 AND tenant_id = $5
		RETURNING ` + articleColumns

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

	countQuery := `
		SELECT COUNT(*)
		FROM kb_articles
		WHERE tenant_id = $1
			AND (
				title ILIKE '%' || $2 || '%'
				OR content ILIKE '%' || $2 || '%'
				OR $2 = ANY(tags)
			)`

	var total int
	err := s.pool.QueryRow(ctx, countQuery, auth.TenantID, query).Scan(&total)
	if err != nil {
		return nil, 0, apperrors.Internal("failed to count search results", err)
	}

	dataQuery := `
		SELECT ` + articleColumns + `
		FROM kb_articles
		WHERE tenant_id = $1
			AND (
				title ILIKE '%' || $2 || '%'
				OR content ILIKE '%' || $2 || '%'
				OR $2 = ANY(tags)
			)
		ORDER BY
			CASE WHEN title ILIKE '%' || $2 || '%' THEN 0 ELSE 1 END,
			view_count DESC,
			created_at DESC
		LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, dataQuery, auth.TenantID, query, params.Limit, params.Offset())
	if err != nil {
		return nil, 0, apperrors.Internal("failed to search KB articles", err)
	}
	defer rows.Close()

	var articles []KBArticle
	for rows.Next() {
		var a KBArticle
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.CategoryID, &a.Title, &a.Slug,
			&a.Content, &a.Status, &a.Version, &a.Type, &a.Tags,
			&a.AuthorID, &a.ReviewerID, &a.PublishedAt,
			&a.ViewCount, &a.HelpfulCount, &a.NotHelpfulCount,
			&a.LinkedTicketIDs, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, apperrors.Internal("failed to scan search result", err)
		}
		articles = append(articles, a)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.Internal("failed to iterate search results", err)
	}

	if articles == nil {
		articles = []KBArticle{}
	}

	return articles, total, nil
}

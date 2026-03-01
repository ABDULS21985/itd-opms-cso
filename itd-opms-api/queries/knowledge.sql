-- ──────────────────────────────────────────────
-- KB Categories
-- ──────────────────────────────────────────────

-- name: CreateKBCategory :one
INSERT INTO kb_categories (tenant_id, name, description, parent_id, icon, sort_order)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetKBCategory :one
SELECT * FROM kb_categories WHERE id = $1 AND tenant_id = $2;

-- name: ListKBCategories :many
SELECT * FROM kb_categories
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR parent_id = $2)
ORDER BY sort_order, name;

-- name: UpdateKBCategory :one
UPDATE kb_categories
SET name        = COALESCE($3, name),
    description = COALESCE($4, description),
    parent_id   = COALESCE($5, parent_id),
    icon        = COALESCE($6, icon),
    sort_order  = COALESCE($7, sort_order)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteKBCategory :exec
DELETE FROM kb_categories WHERE id = $1 AND tenant_id = $2;

-- name: ListKBCategoriesRecursive :many
WITH RECURSIVE cat_tree AS (
    SELECT id, tenant_id, name, description, parent_id, icon, sort_order, created_at, updated_at, 0 AS depth
    FROM kb_categories
    WHERE tenant_id = $1 AND parent_id IS NULL
    UNION ALL
    SELECT c.id, c.tenant_id, c.name, c.description, c.parent_id, c.icon, c.sort_order, c.created_at, c.updated_at, ct.depth + 1
    FROM kb_categories c
    INNER JOIN cat_tree ct ON ct.id = c.parent_id
)
SELECT id, tenant_id, name, description, parent_id, icon, sort_order, created_at, updated_at, depth
FROM cat_tree
ORDER BY depth, sort_order, name;

-- ──────────────────────────────────────────────
-- KB Articles
-- ──────────────────────────────────────────────

-- name: CreateKBArticle :one
INSERT INTO kb_articles (tenant_id, category_id, title, slug, content, type, tags, author_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetKBArticle :one
SELECT * FROM kb_articles WHERE id = $1 AND tenant_id = $2;

-- name: GetKBArticleBySlug :one
SELECT * FROM kb_articles WHERE slug = $1 AND tenant_id = $2;

-- name: ListKBArticles :many
SELECT * FROM kb_articles
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR category_id = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::text IS NULL OR type = $4)
  AND ($5::uuid IS NULL OR author_id = $5)
ORDER BY updated_at DESC
LIMIT $6 OFFSET $7;

-- name: CountKBArticles :one
SELECT COUNT(*)::int AS count FROM kb_articles
WHERE tenant_id = $1
  AND ($2::uuid IS NULL OR category_id = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::text IS NULL OR type = $4)
  AND ($5::uuid IS NULL OR author_id = $5);

-- name: UpdateKBArticle :one
UPDATE kb_articles
SET category_id  = COALESCE($3, category_id),
    title        = COALESCE($4, title),
    slug         = COALESCE($5, slug),
    content      = COALESCE($6, content),
    type         = COALESCE($7, type),
    tags         = COALESCE($8, tags),
    reviewer_id  = COALESCE($9, reviewer_id)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteKBArticle :exec
DELETE FROM kb_articles WHERE id = $1 AND tenant_id = $2;

-- name: PublishKBArticle :one
UPDATE kb_articles
SET status       = 'published',
    published_at = now(),
    version      = version + 1
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: ArchiveKBArticle :exec
UPDATE kb_articles
SET status = 'archived'
WHERE id = $1 AND tenant_id = $2;

-- name: IncrementViewCount :exec
UPDATE kb_articles
SET view_count = view_count + 1
WHERE id = $1;

-- name: IncrementHelpfulCount :exec
UPDATE kb_articles
SET helpful_count = helpful_count + 1
WHERE id = $1;

-- name: IncrementNotHelpfulCount :exec
UPDATE kb_articles
SET not_helpful_count = not_helpful_count + 1
WHERE id = $1;

-- name: SearchKBArticles :many
SELECT *,
       ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $2)) AS rank
FROM kb_articles
WHERE tenant_id = $1
  AND status = 'published'
  AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $2)
ORDER BY rank DESC
LIMIT $3 OFFSET $4;

-- name: CountSearchKBArticles :one
SELECT COUNT(*)::int AS count
FROM kb_articles
WHERE tenant_id = $1
  AND status = 'published'
  AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $2);

-- ──────────────────────────────────────────────
-- KB Article Versions
-- ──────────────────────────────────────────────

-- name: CreateKBArticleVersion :one
INSERT INTO kb_article_versions (article_id, version, content, changed_by)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListKBArticleVersions :many
SELECT * FROM kb_article_versions
WHERE article_id = $1
ORDER BY version DESC;

-- name: GetKBArticleVersion :one
SELECT * FROM kb_article_versions
WHERE article_id = $1 AND version = $2;

-- ──────────────────────────────────────────────
-- KB Article Feedback
-- ──────────────────────────────────────────────

-- name: CreateKBArticleFeedback :one
INSERT INTO kb_article_feedback (article_id, user_id, is_helpful, comment)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListKBArticleFeedback :many
SELECT * FROM kb_article_feedback
WHERE article_id = $1
ORDER BY created_at DESC;

-- name: GetArticleFeedbackStats :one
SELECT COUNT(*)::int AS total,
       COALESCE(SUM(is_helpful::int), 0)::int AS helpful,
       (COUNT(*) - COALESCE(SUM(is_helpful::int), 0))::int AS not_helpful
FROM kb_article_feedback
WHERE article_id = $1;

-- name: DeleteKBArticleFeedback :exec
DELETE FROM kb_article_feedback WHERE id = $1;

-- ──────────────────────────────────────────────
-- Announcements
-- ──────────────────────────────────────────────

-- name: CreateAnnouncement :one
INSERT INTO announcements (tenant_id, title, content, priority, target_audience, target_ids, expires_at, author_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetAnnouncement :one
SELECT * FROM announcements WHERE id = $1 AND tenant_id = $2;

-- name: ListAnnouncements :many
SELECT * FROM announcements
WHERE tenant_id = $1
  AND ($2::boolean IS NULL OR is_active = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountAnnouncements :one
SELECT COUNT(*)::int AS count FROM announcements
WHERE tenant_id = $1
  AND ($2::boolean IS NULL OR is_active = $2);

-- name: UpdateAnnouncement :one
UPDATE announcements
SET title           = COALESCE($3, title),
    content         = COALESCE($4, content),
    priority        = COALESCE($5, priority),
    target_audience = COALESCE($6, target_audience),
    target_ids      = COALESCE($7, target_ids),
    is_active       = COALESCE($8, is_active),
    expires_at      = COALESCE($9, expires_at)
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteAnnouncement :exec
DELETE FROM announcements WHERE id = $1 AND tenant_id = $2;

-- +goose Up
-- Migration 012: Knowledge Management Module
-- Supports: KB categories, KB articles with versioning, article feedback,
-- full-text search, announcements with targeted audiences.

-- ──────────────────────────────────────────────
-- KB Categories (hierarchical)
-- ──────────────────────────────────────────────
CREATE TABLE kb_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES kb_categories(id),
    icon        TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_categories_tenant ON kb_categories(tenant_id);
CREATE INDEX idx_kb_categories_parent ON kb_categories(parent_id);

CREATE TRIGGER trg_kb_categories_updated
    BEFORE UPDATE ON kb_categories
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- KB Articles
-- ──────────────────────────────────────────────
CREATE TABLE kb_articles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    category_id       UUID REFERENCES kb_categories(id),
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL,
    content           TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived','retired')),
    version           INT NOT NULL DEFAULT 1,
    type              TEXT NOT NULL DEFAULT 'how_to' CHECK (type IN ('how_to','troubleshooting','faq','best_practice','runbook')),
    tags              TEXT[] DEFAULT '{}',
    author_id         UUID NOT NULL REFERENCES users(id),
    reviewer_id       UUID REFERENCES users(id),
    published_at      TIMESTAMPTZ,
    view_count        INT NOT NULL DEFAULT 0,
    helpful_count     INT NOT NULL DEFAULT 0,
    not_helpful_count INT NOT NULL DEFAULT 0,
    linked_ticket_ids UUID[] DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_kb_articles_tenant_status ON kb_articles(tenant_id, status);
CREATE INDEX idx_kb_articles_tenant_slug ON kb_articles(tenant_id, slug);
CREATE INDEX idx_kb_articles_tenant_category ON kb_articles(tenant_id, category_id);
CREATE INDEX idx_kb_articles_author ON kb_articles(author_id);
CREATE INDEX idx_kb_articles_fts ON kb_articles USING gin (to_tsvector('english', title || ' ' || content));

CREATE TRIGGER trg_kb_articles_updated
    BEFORE UPDATE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- KB Article Versions
-- ──────────────────────────────────────────────
CREATE TABLE kb_article_versions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    version    INT NOT NULL,
    content    TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_article_versions_article_version ON kb_article_versions(article_id, version);

-- ──────────────────────────────────────────────
-- KB Article Feedback
-- ──────────────────────────────────────────────
CREATE TABLE kb_article_feedback (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id),
    is_helpful BOOLEAN NOT NULL,
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_article_feedback_article ON kb_article_feedback(article_id);
CREATE INDEX idx_kb_article_feedback_user ON kb_article_feedback(user_id);

-- ──────────────────────────────────────────────
-- Announcements
-- ──────────────────────────────────────────────
CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','division','unit','role')),
    target_ids      UUID[] DEFAULT '{}',
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    author_id       UUID NOT NULL REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_tenant_active ON announcements(tenant_id, is_active);
CREATE INDEX idx_announcements_author ON announcements(author_id);

CREATE TRIGGER trg_announcements_updated
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- +goose Down
DROP TRIGGER IF EXISTS trg_announcements_updated ON announcements;
DROP TRIGGER IF EXISTS trg_kb_articles_updated ON kb_articles;
DROP TRIGGER IF EXISTS trg_kb_categories_updated ON kb_categories;

DROP INDEX IF EXISTS idx_announcements_author;
DROP INDEX IF EXISTS idx_announcements_tenant_active;
DROP INDEX IF EXISTS idx_kb_article_feedback_user;
DROP INDEX IF EXISTS idx_kb_article_feedback_article;
DROP INDEX IF EXISTS idx_kb_article_versions_article_version;
DROP INDEX IF EXISTS idx_kb_articles_fts;
DROP INDEX IF EXISTS idx_kb_articles_author;
DROP INDEX IF EXISTS idx_kb_articles_tenant_category;
DROP INDEX IF EXISTS idx_kb_articles_tenant_slug;
DROP INDEX IF EXISTS idx_kb_articles_tenant_status;
DROP INDEX IF EXISTS idx_kb_categories_parent;
DROP INDEX IF EXISTS idx_kb_categories_tenant;

DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS kb_article_feedback;
DROP TABLE IF EXISTS kb_article_versions;
DROP TABLE IF EXISTS kb_articles;
DROP TABLE IF EXISTS kb_categories;

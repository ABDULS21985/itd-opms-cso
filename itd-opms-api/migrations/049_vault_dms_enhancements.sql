-- +goose Up
-- Migration 049: Document Vault → Enterprise DMS Enhancements
-- Adds lifecycle states, comments, lifecycle log, expanded shares, and extended metadata.

-- ──────────────────────────────────────────────
-- 1. Expand document status CHECK constraint
-- ──────────────────────────────────────────────
-- Drop old constraint and add expanded lifecycle states.
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check
    CHECK (status IN ('draft', 'active', 'under_review', 'approved', 'rejected', 'archived', 'expired', 'deleted', 'restored'));

-- ──────────────────────────────────────────────
-- 2. Expand document_shares permission CHECK
-- ──────────────────────────────────────────────
ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS document_shares_permission_check;
ALTER TABLE document_shares ADD CONSTRAINT document_shares_permission_check
    CHECK (permission IN ('view', 'download', 'edit', 'share', 'approve'));

-- ──────────────────────────────────────────────
-- 3. Add extended metadata columns to documents
-- ──────────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_code TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_module TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_entity_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidential BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Default owner_id to uploaded_by for existing rows.
UPDATE documents SET owner_id = uploaded_by WHERE owner_id IS NULL;

-- ──────────────────────────────────────────────
-- 4. Create document_comments table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    parent_id   UUID REFERENCES document_comments(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_doc ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent ON document_comments(parent_id) WHERE parent_id IS NOT NULL;

CREATE TRIGGER trg_document_comments_updated
    BEFORE UPDATE ON document_comments
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 5. Create document_lifecycle_log table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_lifecycle_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    from_status   TEXT NOT NULL,
    to_status     TEXT NOT NULL,
    changed_by    UUID NOT NULL REFERENCES users(id),
    reason        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_lifecycle_log_doc ON document_lifecycle_log(document_id);

-- ──────────────────────────────────────────────
-- 6. Add revoked_at to document_shares for soft-revoke
-- ──────────────────────────────────────────────
ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE document_shares ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id);

-- ──────────────────────────────────────────────
-- 7. Additional indexes for DMS queries
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date)
    WHERE expiry_date IS NOT NULL AND status NOT IN ('deleted', 'expired');

CREATE INDEX IF NOT EXISTS idx_documents_retention ON documents(retention_until)
    WHERE retention_until IS NOT NULL AND status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_documents_legal_hold ON documents(legal_hold)
    WHERE legal_hold = true;

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source_module, source_entity_id)
    WHERE source_module IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_shares_active ON document_shares(document_id)
    WHERE revoked_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_document_shares_active;
DROP INDEX IF EXISTS idx_documents_source;
DROP INDEX IF EXISTS idx_documents_owner;
DROP INDEX IF EXISTS idx_documents_legal_hold;
DROP INDEX IF EXISTS idx_documents_retention;
DROP INDEX IF EXISTS idx_documents_expiry;

ALTER TABLE document_shares DROP COLUMN IF EXISTS revoked_by;
ALTER TABLE document_shares DROP COLUMN IF EXISTS revoked_at;

DROP TRIGGER IF EXISTS trg_document_comments_updated ON document_comments;
DROP TABLE IF EXISTS document_lifecycle_log;
DROP TABLE IF EXISTS document_comments;

ALTER TABLE documents DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE documents DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE documents DROP COLUMN IF EXISTS archived_by;
ALTER TABLE documents DROP COLUMN IF EXISTS archived_at;
ALTER TABLE documents DROP COLUMN IF EXISTS legal_hold;
ALTER TABLE documents DROP COLUMN IF EXISTS confidential;
ALTER TABLE documents DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE documents DROP COLUMN IF EXISTS effective_date;
ALTER TABLE documents DROP COLUMN IF EXISTS source_entity_id;
ALTER TABLE documents DROP COLUMN IF EXISTS source_module;
ALTER TABLE documents DROP COLUMN IF EXISTS document_code;
ALTER TABLE documents DROP COLUMN IF EXISTS owner_id;

-- Restore original constraints.
ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS document_shares_permission_check;
ALTER TABLE document_shares ADD CONSTRAINT document_shares_permission_check
    CHECK (permission IN ('view', 'edit', 'manage'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check
    CHECK (status IN ('active', 'archived', 'deleted'));

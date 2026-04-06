-- +goose Up
-- Migration 050: Vault DMS security hardening.
-- Adds granular document permissions, access-level enforcement indexes,
-- unique share constraints, and IP address tracking in the access log.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Granular permissions: documents.share, documents.approve,
--    documents.delete, documents.admin
-- ─────────────────────────────────────────────────────────────────────

-- itd_director: add documents.approve
UPDATE roles SET permissions = permissions || '["documents.approve"]'::jsonb
WHERE name = 'itd_director'
  AND NOT permissions @> '["documents.approve"]'::jsonb;

-- head_of_division: add documents.share, documents.approve, documents.delete
UPDATE roles SET permissions = permissions || '["documents.share", "documents.approve", "documents.delete"]'::jsonb
WHERE name = 'head_of_division'
  AND NOT permissions @> '["documents.share"]'::jsonb;

-- supervisor: add documents.share, documents.delete
UPDATE roles SET permissions = permissions || '["documents.share", "documents.delete"]'::jsonb
WHERE name = 'supervisor'
  AND NOT permissions @> '["documents.share"]'::jsonb;

-- auditor: add documents.admin (read-only audit access to all docs)
UPDATE roles SET permissions = permissions || '["documents.admin"]'::jsonb
WHERE name = 'auditor'
  AND NOT permissions @> '["documents.admin"]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Unique constraints to prevent duplicate active shares
-- ─────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_shares_unique_user_active
  ON document_shares (document_id, shared_with_user_id, permission)
  WHERE revoked_at IS NULL AND shared_with_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_shares_unique_role_active
  ON document_shares (document_id, shared_with_role, permission)
  WHERE revoked_at IS NULL AND shared_with_role IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Index for "shared with me" queries
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_document_shares_recipient_user
  ON document_shares (shared_with_user_id, tenant_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_shares_recipient_role
  ON document_shares (shared_with_role, tenant_id)
  WHERE revoked_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Index for expiry/retention enforcement worker
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_expiry_enforceable
  ON documents (expiry_date)
  WHERE expiry_date IS NOT NULL
    AND status NOT IN ('deleted', 'expired', 'archived');

CREATE INDEX IF NOT EXISTS idx_documents_retention_enforceable
  ON documents (retention_until)
  WHERE retention_until IS NOT NULL
    AND status NOT IN ('deleted', 'archived');

-- +goose Down

-- Remove indexes
DROP INDEX IF EXISTS idx_documents_retention_enforceable;
DROP INDEX IF EXISTS idx_documents_expiry_enforceable;
DROP INDEX IF EXISTS idx_document_shares_recipient_role;
DROP INDEX IF EXISTS idx_document_shares_recipient_user;
DROP INDEX IF EXISTS idx_document_shares_unique_role_active;
DROP INDEX IF EXISTS idx_document_shares_unique_user_active;

-- Revert permissions (remove the new ones we added)
UPDATE roles SET permissions = permissions - 'documents.approve'
WHERE name = 'itd_director';

UPDATE roles SET permissions = permissions - 'documents.share' - 'documents.approve' - 'documents.delete'
WHERE name = 'head_of_division';

UPDATE roles SET permissions = permissions - 'documents.share' - 'documents.delete'
WHERE name = 'supervisor';

UPDATE roles SET permissions = permissions - 'documents.admin'
WHERE name = 'auditor';

-- +goose Up
-- Migration 051: Vault DMS data integrity validation and cleanup.
-- Ensures is_latest correctness, fixes orphan version chains, and adds
-- operational indexes for production readiness.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Fix is_latest integrity: for each version chain, exactly one
--    document (the one with the highest version) should be is_latest=true.
-- ─────────────────────────────────────────────────────────────────────

-- Step 1a: Set is_latest=false on all non-max-version rows within chains.
UPDATE documents d
SET is_latest = false, updated_at = NOW()
WHERE d.parent_document_id IS NOT NULL
  AND d.is_latest = true
  AND d.version < (
    SELECT MAX(d2.version)
    FROM documents d2
    WHERE d2.parent_document_id = d.parent_document_id
      AND d2.status != 'deleted'
  );

-- Step 1b: Ensure the max-version row in each chain is is_latest=true
-- (unless it's deleted).
UPDATE documents d
SET is_latest = true, updated_at = NOW()
WHERE d.parent_document_id IS NOT NULL
  AND d.is_latest = false
  AND d.status != 'deleted'
  AND d.version = (
    SELECT MAX(d2.version)
    FROM documents d2
    WHERE d2.parent_document_id = d.parent_document_id
      AND d2.status != 'deleted'
  );

-- Step 1c: For root documents (parent_document_id IS NULL) that have
-- child versions, set is_latest=false on the root if a newer version exists.
UPDATE documents d
SET is_latest = false, updated_at = NOW()
WHERE d.parent_document_id IS NULL
  AND d.is_latest = true
  AND EXISTS (
    SELECT 1 FROM documents d2
    WHERE d2.parent_document_id = d.id
      AND d2.status != 'deleted'
      AND d2.version > d.version
  );

-- ─────────────────────────────────────────────────────────────────────
-- 2. Default NULL ip_address values to empty string for consistency.
-- ─────────────────────────────────────────────────────────────────────

UPDATE document_access_log
SET ip_address = ''
WHERE ip_address IS NULL;

ALTER TABLE document_access_log
  ALTER COLUMN ip_address SET DEFAULT '';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Operational indexes for production query patterns.
-- ─────────────────────────────────────────────────────────────────────

-- Composite index for document list queries (tenant + latest + status).
CREATE INDEX IF NOT EXISTS idx_documents_tenant_latest_status
  ON documents (tenant_id, is_latest, status)
  WHERE is_latest = true AND status != 'deleted';

-- Index for access log pagination (document_id + created_at DESC).
CREATE INDEX IF NOT EXISTS idx_document_access_log_doc_time
  ON document_access_log (document_id, created_at DESC);

-- Index for comments by document (for efficient listing).
CREATE INDEX IF NOT EXISTS idx_document_comments_doc_time
  ON document_comments (document_id, created_at ASC);

-- Index for lifecycle log by document.
CREATE INDEX IF NOT EXISTS idx_document_lifecycle_log_doc_time
  ON document_lifecycle_log (document_id, created_at DESC);

-- Index for version chain queries (parent_document_id + version).
CREATE INDEX IF NOT EXISTS idx_documents_version_chain
  ON documents (parent_document_id, version DESC)
  WHERE parent_document_id IS NOT NULL;

-- Index for org_unit_id filtering on document_folders.
CREATE INDEX IF NOT EXISTS idx_document_folders_org_unit
  ON document_folders (tenant_id, org_unit_id)
  WHERE org_unit_id IS NOT NULL;

-- +goose Down

DROP INDEX IF EXISTS idx_document_folders_org_unit;
DROP INDEX IF EXISTS idx_documents_version_chain;
DROP INDEX IF EXISTS idx_document_lifecycle_log_doc_time;
DROP INDEX IF EXISTS idx_document_comments_doc_time;
DROP INDEX IF EXISTS idx_document_access_log_doc_time;
DROP INDEX IF EXISTS idx_documents_tenant_latest_status;

ALTER TABLE document_access_log ALTER COLUMN ip_address DROP DEFAULT;

-- +goose Up
-- Migration 028: Document Vault Enhancements

CREATE TABLE IF NOT EXISTS document_folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    parent_id   UUID REFERENCES document_folders(id),
    name        TEXT NOT NULL,
    description TEXT,
    path        TEXT NOT NULL,
    color       TEXT,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, path)
);

CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_path ON document_folders(tenant_id, path);

CREATE TRIGGER trg_document_folders_updated
    BEFORE UPDATE ON document_folders
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Add folder reference, version tracking, and lock support to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(tenant_id, is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE status = 'active';

-- Document access log
CREATE TABLE IF NOT EXISTS document_access_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_access_log_doc ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user ON document_access_log(user_id);

-- Document shares
CREATE TABLE IF NOT EXISTS document_shares (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    shared_with_user_id UUID REFERENCES users(id),
    shared_with_role    TEXT,
    permission  TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'manage')),
    shared_by   UUID NOT NULL REFERENCES users(id),
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_shares_doc ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user ON document_shares(shared_with_user_id);

-- +goose Down
DROP TABLE IF EXISTS document_shares;
DROP TABLE IF EXISTS document_access_log;
ALTER TABLE documents DROP COLUMN IF EXISTS updated_at;
ALTER TABLE documents DROP COLUMN IF EXISTS access_level;
ALTER TABLE documents DROP COLUMN IF EXISTS status;
ALTER TABLE documents DROP COLUMN IF EXISTS locked_at;
ALTER TABLE documents DROP COLUMN IF EXISTS locked_by;
ALTER TABLE documents DROP COLUMN IF EXISTS is_latest;
ALTER TABLE documents DROP COLUMN IF EXISTS parent_document_id;
ALTER TABLE documents DROP COLUMN IF EXISTS version;
ALTER TABLE documents DROP COLUMN IF EXISTS folder_id;
DROP TRIGGER IF EXISTS trg_document_folders_updated ON document_folders;
DROP TABLE IF EXISTS document_folders;

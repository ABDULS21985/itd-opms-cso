-- +goose Up
-- Migration 005: Documents and Evidence Items

-- Document classification
CREATE TYPE document_classification AS ENUM (
    'audit_evidence',
    'operational',
    'configuration',
    'policy',
    'report',
    'transient'
);

-- ──────────────────────────────────────────────
-- Documents table (MinIO-stored files)
-- ──────────────────────────────────────────────
CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    title               TEXT NOT NULL,
    description         TEXT,
    file_key            TEXT NOT NULL,  -- MinIO object path
    content_type        TEXT NOT NULL,
    size_bytes          BIGINT NOT NULL,
    checksum_sha256     TEXT NOT NULL,
    classification      document_classification NOT NULL DEFAULT 'operational',
    retention_until     TIMESTAMPTZ,
    tags                TEXT[] DEFAULT '{}',
    uploaded_by         UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_classification ON documents(classification);
CREATE INDEX idx_documents_retention ON documents(retention_until) WHERE retention_until IS NOT NULL;
CREATE INDEX idx_documents_uploader ON documents(uploaded_by);

-- ──────────────────────────────────────────────
-- Evidence Items (links entities to documents)
-- ──────────────────────────────────────────────
CREATE TABLE evidence_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    document_id     UUID NOT NULL REFERENCES documents(id),
    description     TEXT,
    collected_by    UUID NOT NULL REFERENCES users(id),
    collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_immutable    BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_evidence_entity ON evidence_items(entity_type, entity_id);
CREATE INDEX idx_evidence_document ON evidence_items(document_id);
CREATE INDEX idx_evidence_tenant ON evidence_items(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS evidence_items;
DROP TABLE IF EXISTS documents;
DROP TYPE IF EXISTS document_classification;

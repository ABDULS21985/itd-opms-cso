-- +goose Up
-- Project bulk import batch tracking

CREATE TABLE IF NOT EXISTS project_import_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    file_name       TEXT NOT NULL,
    file_format     TEXT NOT NULL CHECK (file_format IN ('xlsx', 'csv')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'importing', 'completed', 'failed', 'cancelled')),
    total_rows      INT NOT NULL DEFAULT 0,
    valid_rows      INT NOT NULL DEFAULT 0,
    invalid_rows    INT NOT NULL DEFAULT 0,
    imported_rows   INT NOT NULL DEFAULT 0,
    failed_rows     INT NOT NULL DEFAULT 0,
    preview_data    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_batches_tenant ON project_import_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON project_import_batches(tenant_id, status);

CREATE TABLE IF NOT EXISTS project_import_batch_errors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id    UUID NOT NULL REFERENCES project_import_batches(id) ON DELETE CASCADE,
    row_number  INT NOT NULL,
    column_name TEXT,
    field_value TEXT,
    error_code  TEXT NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_batch_errors_batch ON project_import_batch_errors(batch_id);

-- +goose Down
DROP TABLE IF EXISTS project_import_batch_errors;
DROP TABLE IF EXISTS project_import_batches;

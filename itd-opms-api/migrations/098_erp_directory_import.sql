-- +goose Up
-- Migration 098: ERP directory import support
-- Adds non-sensitive ERP identity fields, import run tracking, and sanitized staging rows.

ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assignment_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS person_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS erp_organization_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS source_system TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS source_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_employee_number
    ON users(tenant_id, employee_number)
    WHERE employee_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_supervisor_user
    ON users(supervisor_user_id)
    WHERE supervisor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_source_system
    ON users(tenant_id, source_system)
    WHERE source_system IS NOT NULL;

CREATE TABLE IF NOT EXISTS erp_directory_import_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    source_path         TEXT NOT NULL,
    source_checksum     TEXT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('previewed', 'running', 'completed', 'failed')),
    mode                TEXT NOT NULL DEFAULT 'reset' CHECK (mode IN ('preview', 'reset')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    triggered_by        UUID REFERENCES users(id),
    total_rows          INTEGER NOT NULL DEFAULT 0,
    users_created       INTEGER NOT NULL DEFAULT 0,
    users_updated       INTEGER NOT NULL DEFAULT 0,
    users_deactivated   INTEGER NOT NULL DEFAULT 0,
    users_inactive      INTEGER NOT NULL DEFAULT 0,
    org_units_upserted  INTEGER NOT NULL DEFAULT 0,
    role_bindings_added INTEGER NOT NULL DEFAULT 0,
    warnings_count      INTEGER NOT NULL DEFAULT 0,
    errors_count        INTEGER NOT NULL DEFAULT 0,
    summary             JSONB NOT NULL DEFAULT '{}',
    errors              JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_erp_directory_import_runs_tenant_started
    ON erp_directory_import_runs(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS erp_employee_staging (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_run_id       UUID NOT NULL REFERENCES erp_directory_import_runs(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    row_number          INTEGER NOT NULL,
    employee_number     TEXT NOT NULL,
    assignment_number   TEXT,
    person_id           INTEGER,
    user_name           TEXT,
    source_email        TEXT,
    effective_email     TEXT NOT NULL,
    email_quality       TEXT NOT NULL,
    display_name        TEXT NOT NULL,
    job_name            TEXT,
    employment_status   TEXT NOT NULL,
    is_active           BOOLEAN NOT NULL,
    department_id       INTEGER,
    department_name     TEXT,
    division_id         INTEGER,
    division_name       TEXT,
    office_id           INTEGER,
    office_name         TEXT,
    location_code       TEXT,
    grade               TEXT,
    supervisor_employee_number TEXT,
    head_of_dept_employee_number TEXT,
    head_of_div_employee_number TEXT,
    head_of_office_employee_number TEXT,
    assigned_org_unit_code TEXT,
    role_flags          JSONB NOT NULL DEFAULT '{}',
    validation_errors   JSONB NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_employee_staging_run
    ON erp_employee_staging(import_run_id);

CREATE INDEX IF NOT EXISTS idx_erp_employee_staging_employee
    ON erp_employee_staging(tenant_id, employee_number);

-- +goose Down
DROP INDEX IF EXISTS idx_erp_employee_staging_employee;
DROP INDEX IF EXISTS idx_erp_employee_staging_run;
DROP TABLE IF EXISTS erp_employee_staging;
DROP INDEX IF EXISTS idx_erp_directory_import_runs_tenant_started;
DROP TABLE IF EXISTS erp_directory_import_runs;
DROP INDEX IF EXISTS idx_users_source_system;
DROP INDEX IF EXISTS idx_users_supervisor_user;
DROP INDEX IF EXISTS idx_users_tenant_employee_number;
ALTER TABLE users DROP COLUMN IF EXISTS source_synced_at;
ALTER TABLE users DROP COLUMN IF EXISTS source_system;
ALTER TABLE users DROP COLUMN IF EXISTS supervisor_user_id;
ALTER TABLE users DROP COLUMN IF EXISTS hire_date;
ALTER TABLE users DROP COLUMN IF EXISTS grade;
ALTER TABLE users DROP COLUMN IF EXISTS employment_status;
ALTER TABLE users DROP COLUMN IF EXISTS erp_organization_id;
ALTER TABLE users DROP COLUMN IF EXISTS person_id;
ALTER TABLE users DROP COLUMN IF EXISTS assignment_number;
ALTER TABLE users DROP COLUMN IF EXISTS employee_number;

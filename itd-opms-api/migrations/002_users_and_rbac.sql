-- +goose Up
-- Migration 002: Users, Roles, Role Bindings, Delegations

-- Scope type for role bindings
CREATE TYPE scope_type AS ENUM ('global', 'tenant', 'division', 'office', 'unit');

-- ──────────────────────────────────────────────
-- Users table (Entra ID based — no local passwords in production)
-- password_hash is for dev-mode JWT auth only
-- ──────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_id        TEXT UNIQUE,
    email           TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    job_title       TEXT,
    department      TEXT,
    office          TEXT,
    unit            TEXT,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    photo_url       TEXT,
    phone           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    password_hash   TEXT,  -- dev-mode only, NULL in production
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_entra_id ON users(entra_id) WHERE entra_id IS NOT NULL;
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_active ON users(tenant_id, is_active) WHERE is_active = true;

-- Add FK from org_units.manager_user_id to users
ALTER TABLE org_units ADD CONSTRAINT fk_org_units_manager
    FOREIGN KEY (manager_user_id) REFERENCES users(id);

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Roles table
-- ──────────────────────────────────────────────
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Role Bindings (user ↔ role ↔ scope)
-- ──────────────────────────────────────────────
CREATE TABLE role_bindings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    scope_type  scope_type NOT NULL DEFAULT 'tenant',
    scope_id    UUID,
    granted_by  UUID REFERENCES users(id),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_role_bindings_user ON role_bindings(user_id) WHERE is_active = true;
CREATE INDEX idx_role_bindings_tenant ON role_bindings(tenant_id);
CREATE UNIQUE INDEX idx_role_bindings_unique ON role_bindings(user_id, role_id, tenant_id, scope_type, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000')) WHERE is_active = true;

-- ──────────────────────────────────────────────
-- Delegations (time-bound role elevation)
-- ──────────────────────────────────────────────
CREATE TABLE delegations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_id    UUID NOT NULL REFERENCES users(id),
    delegate_id     UUID NOT NULL REFERENCES users(id),
    role_id         UUID NOT NULL REFERENCES roles(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    reason          TEXT NOT NULL,
    approved_by     UUID REFERENCES users(id),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delegations_delegate ON delegations(delegate_id) WHERE is_active = true;
CREATE INDEX idx_delegations_active ON delegations(is_active, starts_at, ends_at);

-- ──────────────────────────────────────────────
-- Refresh tokens table (for JWT dev-mode auth)
-- ──────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked = false;

-- ──────────────────────────────────────────────
-- Seed: 7 system roles with permissions
-- ──────────────────────────────────────────────
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'global_admin',
    'Full system administrator with all permissions',
    '["*"]',
    true
),
(
    '10000000-0000-0000-0000-000000000002',
    'itd_director',
    'ITD Director — cross-division read, approve, report access',
    '["governance.read", "governance.approve", "people.read", "planning.read", "planning.approve", "itsm.read", "itsm.approve", "cmdb.read", "knowledge.read", "grc.read", "grc.approve", "reporting.read", "reporting.export", "audit.read"]',
    true
),
(
    '10000000-0000-0000-0000-000000000003',
    'head_of_division',
    'Head of Division — division-scoped CRUD and approve',
    '["governance.read", "governance.write", "governance.approve", "people.read", "people.write", "planning.read", "planning.write", "planning.approve", "itsm.read", "itsm.write", "itsm.approve", "cmdb.read", "cmdb.write", "knowledge.read", "knowledge.write", "grc.read", "grc.write", "reporting.read", "reporting.export"]',
    true
),
(
    '10000000-0000-0000-0000-000000000004',
    'supervisor',
    'Supervisor — unit-scoped CRUD with limited approve',
    '["governance.read", "people.read", "people.write", "planning.read", "planning.write", "itsm.read", "itsm.write", "cmdb.read", "knowledge.read", "knowledge.write", "grc.read", "reporting.read"]',
    true
),
(
    '10000000-0000-0000-0000-000000000005',
    'staff',
    'Staff member — self-scoped, read own division',
    '["governance.read", "people.read_self", "planning.read", "itsm.read", "itsm.create_ticket", "cmdb.read", "knowledge.read", "grc.read"]',
    true
),
(
    '10000000-0000-0000-0000-000000000006',
    'auditor',
    'Auditor — read-only all modules plus audit-specific permissions',
    '["governance.read", "people.read", "planning.read", "itsm.read", "cmdb.read", "knowledge.read", "grc.read", "grc.write", "grc.approve", "audit.read", "audit.verify", "reporting.read", "reporting.export"]',
    true
),
(
    '10000000-0000-0000-0000-000000000007',
    'service_desk_agent',
    'Service Desk Agent — ITSM CRUD with limited scope',
    '["itsm.read", "itsm.write", "itsm.assign", "itsm.resolve", "cmdb.read", "knowledge.read", "knowledge.write"]',
    true
);

-- ──────────────────────────────────────────────
-- Seed: Dev admin user (dev-mode only)
-- Password: "admin123" bcrypt hash
-- ──────────────────────────────────────────────
INSERT INTO users (id, email, display_name, job_title, department, tenant_id, is_active, password_hash) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'admin@itd.cbn.gov.ng',
    'System Administrator',
    'IT Director',
    'Information Technology',
    '00000000-0000-0000-0000-000000000001',
    true,
    '$2a$10$25lLTNSLitmXoxckd4dfNOp39C8lnGOK3FkU/C9sMjJBtOOmXvrpS'
);

-- Bind admin to global_admin role
INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'global'
);

-- +goose Down
DELETE FROM role_bindings;
DELETE FROM users;
DELETE FROM roles;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS delegations;
DROP TABLE IF EXISTS role_bindings;
ALTER TABLE org_units DROP CONSTRAINT IF EXISTS fk_org_units_manager;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS scope_type;

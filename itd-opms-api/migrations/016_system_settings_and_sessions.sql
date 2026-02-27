-- +goose Up
-- Migration 016: System Settings, Active Sessions & Email Templates

-- ──────────────────────────────────────────────
-- System settings (key-value with JSONB, tenant-scoped or global)
-- ──────────────────────────────────────────────
CREATE TABLE system_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),  -- NULL = global setting
    category    TEXT NOT NULL,       -- 'general', 'security', 'notifications', 'branding', 'integrations'
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    description TEXT,
    is_secret   BOOLEAN DEFAULT false,  -- mask value in API responses
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, category, key)
);

CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_tenant ON system_settings(tenant_id) WHERE tenant_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- Active sessions for session management
-- ──────────────────────────────────────────────
CREATE TABLE active_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    token_hash   TEXT NOT NULL UNIQUE,
    ip_address   INET,
    user_agent   TEXT,
    device_info  JSONB,       -- parsed UA: browser, os, device
    location     TEXT,         -- derived from IP if available
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    last_active  TIMESTAMPTZ DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL,
    is_revoked   BOOLEAN DEFAULT false,
    revoked_at   TIMESTAMPTZ,
    revoked_by   UUID REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON active_sessions(user_id) WHERE NOT is_revoked;
CREATE INDEX idx_sessions_active ON active_sessions(last_active) WHERE NOT is_revoked;
CREATE INDEX idx_sessions_tenant ON active_sessions(tenant_id) WHERE NOT is_revoked;
CREATE INDEX idx_sessions_expires ON active_sessions(expires_at) WHERE NOT is_revoked;

-- ──────────────────────────────────────────────
-- Email templates (customizable notification templates)
-- ──────────────────────────────────────────────
CREATE TABLE email_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id),  -- NULL = global template
    name        TEXT NOT NULL,
    subject     TEXT NOT NULL,
    body_html   TEXT NOT NULL,
    body_text   TEXT,
    variables   JSONB,        -- list of template variables with descriptions
    category    TEXT NOT NULL, -- 'itsm', 'governance', 'grc', 'system', etc.
    is_active   BOOLEAN DEFAULT true,
    updated_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_tenant ON email_templates(tenant_id) WHERE tenant_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- Seed default system settings
-- ──────────────────────────────────────────────
INSERT INTO system_settings (tenant_id, category, key, value, description) VALUES
(NULL, 'general', 'platform_name', '"ITD-OPMS"', 'Platform display name'),
(NULL, 'general', 'platform_tagline', '"Operations & Performance Management System"', 'Platform tagline'),
(NULL, 'general', 'default_timezone', '"Africa/Lagos"', 'Default timezone (WAT)'),
(NULL, 'general', 'date_format', '"DD/MM/YYYY"', 'Default date display format'),
(NULL, 'general', 'items_per_page', '25', 'Default pagination size'),
(NULL, 'security', 'session_timeout_minutes', '30', 'Session inactivity timeout'),
(NULL, 'security', 'max_sessions_per_user', '5', 'Maximum concurrent sessions'),
(NULL, 'security', 'password_min_length', '12', 'Minimum password length (dev mode only)'),
(NULL, 'security', 'enforce_mfa', 'true', 'Require MFA via Entra ID'),
(NULL, 'security', 'allowed_ip_ranges', '[]', 'Allowed IP CIDR ranges (empty = all)'),
(NULL, 'security', 'rate_limit_per_minute', '100', 'API rate limit per user per minute'),
(NULL, 'notifications', 'email_enabled', 'true', 'Enable email notifications'),
(NULL, 'notifications', 'teams_enabled', 'true', 'Enable Teams notifications'),
(NULL, 'notifications', 'quiet_hours_start', '"22:00"', 'Quiet hours start (WAT)'),
(NULL, 'notifications', 'quiet_hours_end', '"07:00"', 'Quiet hours end (WAT)'),
(NULL, 'notifications', 'digest_frequency', '"daily"', 'Notification digest frequency'),
(NULL, 'branding', 'primary_color', '"#1B7340"', 'CBN brand primary color'),
(NULL, 'branding', 'logo_url', '""', 'Custom logo URL'),
(NULL, 'branding', 'favicon_url', '""', 'Custom favicon URL'),
(NULL, 'integrations', 'entra_id_enabled', 'true', 'Entra ID SSO enabled'),
(NULL, 'integrations', 'graph_sync_interval', '"30m"', 'Directory sync interval'),
(NULL, 'integrations', 'graph_sync_enabled', 'true', 'Directory sync enabled');

-- +goose Down
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS active_sessions;
DROP TABLE IF EXISTS system_settings;

-- +goose Up
-- 089_esm_mfa.sql  –  Native MFA support (TOTP + backup codes)

CREATE TABLE IF NOT EXISTS user_mfa_methods (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type       TEXT NOT NULL CHECK (method_type IN ('totp', 'webauthn', 'backup_codes')),
    secret_encrypted  TEXT,       -- AES-256-GCM encrypted TOTP secret
    credential_data   JSONB,      -- WebAuthn credential public key data
    backup_codes      TEXT[],     -- Hashed backup codes
    is_primary        BOOLEAN DEFAULT false,
    is_verified       BOOLEAN DEFAULT false,
    last_used_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mfa_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    challenge_type  TEXT NOT NULL,
    challenge_data  TEXT NOT NULL,   -- Encrypted challenge / user context
    expires_at      TIMESTAMPTZ NOT NULL,
    verified        BOOLEAN DEFAULT false,
    attempts        INT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enforced_at TIMESTAMPTZ;

-- System setting for org-wide MFA enforcement
INSERT INTO system_settings (tenant_id, category, key, value)
VALUES ('00000000-0000-0000-0000-000000000001', 'security', 'mfa_required', '"false"'::jsonb)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_mfa_methods_user ON user_mfa_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user ON mfa_challenges(user_id, expires_at);

-- +goose Down
DROP INDEX IF EXISTS idx_mfa_challenges_user;
DROP INDEX IF EXISTS idx_mfa_methods_user;
DELETE FROM system_settings
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND category = 'security'
  AND key = 'mfa_required';
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enforced_at;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;
DROP TABLE IF EXISTS mfa_challenges;
DROP TABLE IF EXISTS user_mfa_methods;

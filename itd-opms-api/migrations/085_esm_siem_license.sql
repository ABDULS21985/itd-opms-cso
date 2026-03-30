-- 085_esm_siem_license.sql
-- ESM BRD: SIEM audit export checkpoint + concurrent license pool

BEGIN;

-- ──────────────────────────────────────────────
-- 1. SIEM export checkpoint (singleton)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS siem_export_state (
    id                INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_exported_id  BIGINT    NOT NULL DEFAULT 0,
    last_export_at    TIMESTAMPTZ,
    error_count       BIGINT    NOT NULL DEFAULT 0,
    last_error        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO siem_export_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────
-- 2. License pool (singleton)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS license_pool (
    id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    max_licenses    INT         NOT NULL DEFAULT 575,
    current_count   INT         NOT NULL DEFAULT 0,
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton row
INSERT INTO license_pool (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. Extend active_sessions
-- ──────────────────────────────────────────────
ALTER TABLE active_sessions
    ADD COLUMN IF NOT EXISTS login_blocked_reason TEXT;

COMMIT;

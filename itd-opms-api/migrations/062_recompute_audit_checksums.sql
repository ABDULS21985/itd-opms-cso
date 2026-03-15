-- +goose Up
-- Migration 062: Recompute audit_events checksums with the corrected formula.
--
-- Background
-- ----------
-- Migration 003 originally computed checksums using NEW.timestamp::text, which
-- produces a locale-dependent PostgreSQL text representation such as:
--   "2026-03-15 12:34:56.123456+00"
-- The Go VerifyIntegrity service recomputed using time.RFC3339Nano:
--   "2026-03-15T12:34:56.123456Z"
-- These two strings differ (space vs T separator, +00 vs Z timezone), so the
-- SHA-256 hashes never matched and every integrity check reported all events
-- as tampered even when they were valid.
--
-- Fix
-- ---
-- Both the trigger (updated in 003) and the Go service now use Unix microseconds:
--   ((EXTRACT(EPOCH FROM timestamp) * 1000000)::bigint)::text
-- This migration recomputes stored checksums for existing rows using the
-- same formula so that VerifyIntegrity produces correct results.
--
-- Procedure
-- ---------
-- 1. Replace the trigger function to ensure it matches the Go service.
-- 2. Temporarily remove the no_update_audit rule (audit immutability).
-- 3. UPDATE every existing row with its corrected checksum.
-- 4. Restore the no_update_audit rule.

-- Step 1: Replace the trigger function with the corrected timestamp format.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_audit_checksum()
RETURNS TRIGGER AS $$
BEGIN
    -- Unix microseconds: identical to Go's time.Time.UnixMicro().
    NEW.checksum = encode(
        sha256(
            convert_to(
                COALESCE(NEW.tenant_id::text, '') || '|' ||
                COALESCE(NEW.actor_id::text, '') || '|' ||
                COALESCE(NEW.action, '') || '|' ||
                COALESCE(NEW.entity_type, '') || '|' ||
                COALESCE(NEW.entity_id::text, '') || '|' ||
                COALESCE(NEW.changes::text, '') || '|' ||
                ((EXTRACT(EPOCH FROM NEW.timestamp) * 1000000)::bigint)::text,
                'UTF8'
            )
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- Step 2: Temporarily remove the UPDATE immutability rule so we can repair
-- the stored checksums.  The rule is restored immediately after (step 4).
DROP RULE IF EXISTS no_update_audit ON audit_events;

-- Step 3: Recompute every stored checksum using the Unix-microseconds formula.
UPDATE audit_events
SET checksum = encode(
    sha256(
        convert_to(
            COALESCE(tenant_id::text, '') || '|' ||
            COALESCE(actor_id::text, '') || '|' ||
            COALESCE(action, '') || '|' ||
            COALESCE(entity_type, '') || '|' ||
            COALESCE(entity_id::text, '') || '|' ||
            COALESCE(changes::text, '') || '|' ||
            ((EXTRACT(EPOCH FROM timestamp) * 1000000)::bigint)::text,
            'UTF8'
        )
    ),
    'hex'
);

-- Step 4: Restore audit immutability.
CREATE RULE no_update_audit AS ON UPDATE TO audit_events DO INSTEAD NOTHING;

-- +goose Down
-- No rollback — checksums with the old ::text format are incorrect and
-- cannot be restored without recomputing against the original insert time,
-- which would require reading the old trigger code.  To revert, re-run the
-- old formula manually after dropping this migration.

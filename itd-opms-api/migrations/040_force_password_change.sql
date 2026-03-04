-- +goose Up
-- Migration 040: Add force_password_change column to users table.
-- All seeded users with password hashes are flagged for mandatory password change.

ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

-- Flag all users that have a password hash (i.e., seeded users).
UPDATE users SET force_password_change = true WHERE password_hash IS NOT NULL;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS force_password_change;

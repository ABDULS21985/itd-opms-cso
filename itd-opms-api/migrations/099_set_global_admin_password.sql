-- +goose Up
-- Migration 099: Set seeded global admin password.
-- Password: Secured$3211

UPDATE users
SET password_hash = '$2a$10$4SmiZO2ffsRaDefbLF5nkOX6dJtbGjF9tBvHSJrEL/m4299ztEWzS',
    force_password_change = false,
    updated_at = NOW()
WHERE lower(email) IN ('admin@itd.cbn.gov.ng', 'raolaniyan@cbn.gov.ng');

-- +goose Down
-- Keep the configured password on rollback. Earlier migrations define the original seed state.
SELECT 1;

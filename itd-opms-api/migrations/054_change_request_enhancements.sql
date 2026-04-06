-- +goose Up
-- 054_change_request_enhancements.sql
-- Add priority and category columns to change_requests table.

ALTER TABLE change_requests
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_change_requests_priority ON change_requests(tenant_id, priority);

-- +goose Down
DROP INDEX IF EXISTS idx_change_requests_priority;
ALTER TABLE change_requests
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS priority;

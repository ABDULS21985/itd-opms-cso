-- +goose Up
-- FR-A014: Add reminder tracking columns to action_items for automated overdue notifications.
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;

-- +goose Down
ALTER TABLE action_items DROP COLUMN IF EXISTS last_reminder_sent;
ALTER TABLE action_items DROP COLUMN IF EXISTS reminder_count;

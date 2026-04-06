-- +goose Up
-- 092_ticket_subtasks.sql
-- Add parent_ticket_id for subtask (parent-child) relationships
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS parent_ticket_id UUID REFERENCES tickets(id);
CREATE INDEX IF NOT EXISTS idx_tickets_parent ON tickets(parent_ticket_id) WHERE parent_ticket_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_tickets_parent;
ALTER TABLE tickets DROP COLUMN IF EXISTS parent_ticket_id;

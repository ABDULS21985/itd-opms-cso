-- +goose Up
-- Migration 079: Add email-to-ticket columns and notification template.
-- Supports: SendGrid Inbound Parse webhook for creating tickets from email,
-- threading replies back to existing tickets via email_thread_id.

-- ──────────────────────────────────────────────
-- 1. Add email tracking columns to tickets
-- ──────────────────────────────────────────────
ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS reporter_email     TEXT,
    ADD COLUMN IF NOT EXISTS email_thread_id    TEXT,
    ADD COLUMN IF NOT EXISTS email_message_ids  TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tickets_email_thread_id
    ON tickets (email_thread_id) WHERE email_thread_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- 2. Insert notification template for email-reply threading
-- ──────────────────────────────────────────────
INSERT INTO notification_templates (id, key, name, channel, subject_template, body_template, version, is_active)
VALUES (
    gen_random_uuid(),
    'email-reply-instruction',
    'Email Reply Threading Instruction',
    'email',
    'RE: [{{.TicketNumber}}] {{.TicketTitle}}',
    '<p>Your ticket <strong>{{.TicketNumber}}</strong> has been created.</p>
<p><strong>Title:</strong> {{.TicketTitle}}</p>
<p><strong>Priority:</strong> {{.Priority}}</p>
<p>To add updates to this ticket, simply reply to this email. Your reply will be added as a comment automatically.</p>
<p>You can also view your ticket in the portal.</p>',
    1,
    true
)
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DELETE FROM notification_templates WHERE key = 'email-reply-instruction';

ALTER TABLE tickets
    DROP COLUMN IF EXISTS email_message_ids,
    DROP COLUMN IF EXISTS email_thread_id,
    DROP COLUMN IF EXISTS reporter_email;

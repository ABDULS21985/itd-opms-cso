-- +goose Up
-- Migration 097: ITSM lifecycle notification templates.
--
-- These templates back the event-driven ITSM workflow notifications emitted
-- when tickets, problems, changes, and service requests move between states.

INSERT INTO notification_templates (key, name, channel, subject_template, body_template, version, is_active)
VALUES
  (
    'ticket-status-changed',
    'Ticket Status Changed',
    'in_app',
    'Ticket {{.ticketNumber}} moved to {{.newStatus}}',
    'Ticket {{.ticketNumber}} — {{.title}} changed from {{.previousStatus}} to {{.newStatus}}.',
    1,
    true
  ),
  (
    'problem_transition',
    'Problem Status Changed',
    'in_app',
    'Problem {{.problemNumber}} moved to {{.newStatus}}',
    'Problem {{.problemNumber}} — {{.title}} changed from {{.previousStatus}} to {{.newStatus}}.',
    1,
    true
  ),
  (
    'change_transition',
    'Change Status Changed',
    'in_app',
    'Change {{.ticketNumber}} moved to {{.newStatus}}',
    'Change {{.ticketNumber}} — {{.title}} changed from {{.previousStatus}} to {{.newStatus}}.',
    1,
    true
  ),
  (
    'cab_decision',
    'CAB Decision Recorded',
    'in_app',
    'CAB decision recorded for {{.ticketNumber}}',
    'CAB recorded {{.decision}} for {{.ticketNumber}} — {{.title}}.',
    1,
    true
  ),
  (
    'service-request-status-changed',
    'Service Request Status Changed',
    'in_app',
    'Request {{.requestNumber}} moved to {{.newStatus}}',
    'Service request {{.requestNumber}} changed from {{.previousStatus}} to {{.newStatus}}.',
    1,
    true
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  channel = EXCLUDED.channel,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  version = notification_templates.version + 1,
  is_active = true,
  updated_at = NOW();

-- +goose Down
DELETE FROM notification_templates
WHERE key IN (
  'ticket-status-changed',
  'problem_transition',
  'change_transition',
  'cab_decision',
  'service-request-status-changed'
);

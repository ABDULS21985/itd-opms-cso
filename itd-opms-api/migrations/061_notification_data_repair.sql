-- +goose Up
-- Migration 061: Notification data repair and missing template seed.
--
-- Fixes three issues introduced before the notification contract alignment:
--
-- 1. channel_preferences "inApp" → "in_app"
--    Old portal code saved the in-app toggle under the "inApp" key (camelCase).
--    The orchestrator checks "in_app" (snake_case), so affected users had their
--    in-app notifications silently suppressed. Rename the key in-place.
--
-- 2. Stale disabled_types slug values
--    Old portal code wrote human-readable slugs ("sla_breaches", "task_assignments",
--    etc.) into disabled_types. The orchestrator never matched them. Remap each old
--    slug to the corresponding backend event-type prefix so the prefix-matching in
--    isTypeDisabled() takes effect. Unrecognised values are dropped cleanly.
--
-- 3. Missing action-reminder notification templates
--    The orchestrator references "action_due_reminder", "action_overdue_reminder",
--    and "action_critical_overdue" in notification_templates, but migration 006 did
--    not seed them. Without these rows the service logs a warning and sends an empty
--    body. Seed the three missing templates now.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Rename "inApp" → "in_app" in channel_preferences JSONB
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE user_notification_preferences
SET channel_preferences =
    (channel_preferences - 'inApp')
    || jsonb_build_object(
        'in_app',
        COALESCE((channel_preferences ->> 'inApp')::boolean, true)
    )
WHERE channel_preferences ? 'inApp';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Normalise stale disabled_types slug values to backend event-type prefixes.
--
--    Slug → prefix mapping (matches NOTIFICATION_TYPES in the portal settings page):
--      task_assignments  → itsm.ticket
--      service_requests  → itsm.ticket  (same prefix, dedup handled by DISTINCT)
--      sla_breaches      → itsm.sla
--      system_alerts     → itsm.incident
--      approval_requests → governance.approval
--      asset_updates     → cmdb
--      audit_events      → grc
--      project_updates   → (dropped — no direct backend event-type prefix)
--
--    Values already in the new format (containing a dot, e.g. "itsm.sla") are
--    preserved unchanged. Pure old slugs that have no mapping are dropped.
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE user_notification_preferences
SET disabled_types = (
    SELECT ARRAY(
        SELECT DISTINCT new_val
        FROM (
            -- Translate old slugs to new prefixes
            SELECT CASE slug
                WHEN 'task_assignments'  THEN 'itsm.ticket'
                WHEN 'service_requests'  THEN 'itsm.ticket'
                WHEN 'sla_breaches'      THEN 'itsm.sla'
                WHEN 'system_alerts'     THEN 'itsm.incident'
                WHEN 'approval_requests' THEN 'governance.approval'
                WHEN 'asset_updates'     THEN 'cmdb'
                WHEN 'audit_events'      THEN 'grc'
                ELSE NULL
            END AS new_val
            FROM unnest(disabled_types) AS slug
            WHERE slug IN (
                'task_assignments', 'service_requests', 'sla_breaches',
                'system_alerts', 'approval_requests', 'asset_updates',
                'audit_events', 'project_updates'
            )

            UNION ALL

            -- Keep values already in the new format (not old slugs)
            SELECT v AS new_val
            FROM unnest(disabled_types) AS v
            WHERE v NOT IN (
                'task_assignments', 'service_requests', 'sla_breaches',
                'system_alerts', 'approval_requests', 'asset_updates',
                'audit_events', 'project_updates'
            )
        ) AS translated
        WHERE new_val IS NOT NULL
    )
)
WHERE disabled_types && ARRAY[
    'task_assignments', 'service_requests', 'sla_breaches',
    'system_alerts', 'approval_requests', 'asset_updates',
    'audit_events', 'project_updates'
];

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Seed missing action-reminder notification templates into notification_templates.
--    Uses ON CONFLICT DO NOTHING so re-running the migration is safe.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO notification_templates (key, name, channel, subject_template, body_template)
VALUES

('action_due_reminder',
 'Action Item Due Soon',
 'email',
 'Reminder: Action item "{{.ActionTitle}}" is due {{.DueDate}}',
 '<h2>Action Item Due Soon</h2>
<p>Your action item is approaching its due date and requires attention.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;color:#666;font-weight:600">Action</td>
      <td style="padding:8px">{{.ActionTitle}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Due Date</td>
      <td style="padding:8px;color:#D97706">{{.DueDate}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Owner</td>
      <td style="padding:8px">{{.OwnerName}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Related To</td>
      <td style="padding:8px">{{.RelatedEntity}}</td></tr>
</table>
<p><a href="{{.ActionURL}}" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:6px;text-decoration:none">View Action Item</a></p>'),

('action_overdue_reminder',
 'Action Item Overdue',
 'email',
 'Overdue: Action item "{{.ActionTitle}}" was due {{.DueDate}}',
 '<h2 style="color:#DC2626">Action Item Overdue</h2>
<p>The following action item is overdue and requires immediate attention.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;color:#666;font-weight:600">Action</td>
      <td style="padding:8px">{{.ActionTitle}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Was Due</td>
      <td style="padding:8px;color:#DC2626">{{.DueDate}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Days Overdue</td>
      <td style="padding:8px;color:#DC2626">{{.DaysOverdue}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Owner</td>
      <td style="padding:8px">{{.OwnerName}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Related To</td>
      <td style="padding:8px">{{.RelatedEntity}}</td></tr>
</table>
<p><a href="{{.ActionURL}}" style="display:inline-block;padding:10px 20px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none">Take Action Now</a></p>'),

('action_critical_overdue',
 'Action Item Critically Overdue',
 'email',
 '[CRITICAL] Action item "{{.ActionTitle}}" is {{.DaysOverdue}} days overdue',
 '<h2 style="color:#7F1D1D">Critical: Action Item Severely Overdue</h2>
<p style="color:#7F1D1D;font-weight:600">This action item is critically overdue and is escalated for immediate resolution.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #FCA5A5;border-radius:6px">
  <tr style="background:#FEF2F2">
      <td style="padding:8px;color:#666;font-weight:600">Action</td>
      <td style="padding:8px;font-weight:600">{{.ActionTitle}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Was Due</td>
      <td style="padding:8px;color:#DC2626">{{.DueDate}}</td></tr>
  <tr style="background:#FEF2F2">
      <td style="padding:8px;color:#666;font-weight:600">Days Overdue</td>
      <td style="padding:8px;color:#DC2626;font-weight:600">{{.DaysOverdue}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Owner</td>
      <td style="padding:8px">{{.OwnerName}}</td></tr>
  <tr style="background:#FEF2F2">
      <td style="padding:8px;color:#666;font-weight:600">Escalated To</td>
      <td style="padding:8px">{{.EscalateTo}}</td></tr>
  <tr><td style="padding:8px;color:#666;font-weight:600">Related To</td>
      <td style="padding:8px">{{.RelatedEntity}}</td></tr>
</table>
<p><a href="{{.ActionURL}}" style="display:inline-block;padding:10px 20px;background:#7F1D1D;color:#fff;border-radius:6px;text-decoration:none">Resolve Immediately</a></p>')

ON CONFLICT (key) DO NOTHING;

-- +goose Down
-- Reverse template inserts (only if they were added by this migration)
DELETE FROM notification_templates
WHERE key IN ('action_due_reminder', 'action_overdue_reminder', 'action_critical_overdue');

-- Reverse channel_preferences rename is intentionally omitted:
-- rolling back "inApp"→"in_app" would re-break the orchestrator.

-- Reverse disabled_types normalization is intentionally omitted:
-- restoring broken slug values would re-break the type-disable feature.

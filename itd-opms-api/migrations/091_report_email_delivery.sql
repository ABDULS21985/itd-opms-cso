-- +goose Up
-- Add email delivery tracking to report_runs
ALTER TABLE report_runs ADD COLUMN email_delivered_at TIMESTAMPTZ;
ALTER TABLE report_runs ADD COLUMN email_error TEXT;

-- Email template for report definition run delivery
INSERT INTO notification_templates (id, key, name, channel, subject_template, body_template, version, is_active)
VALUES (
    gen_random_uuid(),
    'report-run-delivery',
    'Report Run Delivery',
    'email',
    'Report Ready: {{.ReportName}}',
    '<p>Hello,</p>
<p>Your report <strong>{{.ReportName}}</strong> ({{.ReportType}}) has been generated.</p>
<p><strong>Generated at:</strong> {{.GeneratedAt}}</p>
<p><a href="{{.ViewURL}}">View in ITD-OPMS</a></p>
<p style="color: #888; font-size: 12px;">This is an automated notification from ITD-OPMS.</p>',
    1,
    true
) ON CONFLICT (key) DO NOTHING;

-- +goose Down
ALTER TABLE report_runs DROP COLUMN IF EXISTS email_error;
ALTER TABLE report_runs DROP COLUMN IF EXISTS email_delivered_at;
DELETE FROM notification_templates WHERE key = 'report-run-delivery';

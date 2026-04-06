-- +goose Up
-- Upgrade all 11 notification email templates in notification_templates to the
-- premium design system. These are the templates ACTUALLY rendered by the
-- notification service (Service.renderTemplate → outbox → SendGrid delivery).
--
-- Uses Go html/template syntax: {{.FieldName}}
-- Features: Inter font, gradient accent bar, icon sections, info boxes,
-- gradient CTA buttons with MSO VML fallback, mobile responsive, dark mode,
-- CBN-branded footer with copyright.

-- Helper function to wrap content in the premium email shell.
-- Generates a full HTML email document from template-specific parameters.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION _premium_ntpl(
  p_accent TEXT, p_icon TEXT, p_icon_bg TEXT, p_title TEXT, p_subtitle TEXT,
  p_message TEXT, p_info_html TEXT, p_info_bg TEXT, p_info_border TEXT,
  p_extra TEXT, p_cta_text TEXT, p_cta_var TEXT, p_cta_bg TEXT,
  p_cta_fill TEXT, p_cta_shadow TEXT, p_notice TEXT, p_note TEXT
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE tpl TEXT;
BEGIN
  tpl := $tpl$<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>{TITLE} - ITD-OPMS</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
body{margin:0!important;padding:0!important;width:100%!important}
@media only screen and (max-width:600px){
.email-container{width:100%!important;max-width:100%!important}
.fluid{max-width:100%!important;height:auto!important}
.stack-column{display:block!important;width:100%!important}
.center-on-narrow{text-align:center!important;display:block!important;margin-left:auto!important;margin-right:auto!important}
.padding-mobile{padding-left:20px!important;padding-right:20px!important}
}
@media(prefers-color-scheme:dark){.dark-bg{background-color:#1a1a2e!important}.dark-card{background-color:#16213e!important}}
</style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:#f0f2f5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div role="article" aria-roledescription="email" aria-label="{TITLE}" lang="en" style="font-size:medium;font-size:max(16px,1rem)">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f2f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" class="email-container" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%;">

<tr><td align="center" style="padding:0 0 24px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding-right:10px;vertical-align:middle;">
<div style="width:40px;height:40px;background:linear-gradient(135deg,#0d5c2e 0%,#1B7340 50%,#22c55e 100%);border-radius:10px;display:inline-block;text-align:center;line-height:40px;">
<span style="color:#ffffff;font-size:18px;font-weight:700;">&#9741;</span></div>
</td><td style="vertical-align:middle;">
<p style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">ITD-OPMS</p>
<p style="margin:2px 0 0;font-size:11px;color:#6b7280;letter-spacing:0.5px;text-transform:uppercase;">Operations &amp; Project Management</p>
</td></tr></table></td></tr>

<tr><td>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04);">

<tr><td style="height:4px;background:{ACCENT};font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td class="padding-mobile" style="padding:40px 44px 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="width:56px;height:56px;background:{ICON_BG};border-radius:16px;text-align:center;vertical-align:middle;">
<span style="font-size:26px;line-height:56px;">{ICON}</span></td></tr></table>
<h1 style="margin:20px 0 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.3px;line-height:1.2;">{TITLE}</h1>
<p style="margin:8px 0 0;font-size:15px;color:#6b7280;line-height:1.5;">{SUBTITLE}</p>
</td></tr>

<tr><td class="padding-mobile" style="padding:24px 44px 0;">{MESSAGE}</td></tr>

<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:{INFO_BG};border:{INFO_BORDER};border-radius:12px;">
<tr><td style="padding:16px 20px;">{INFO_HTML}</td></tr></table></td></tr>

{EXTRA}

<tr><td class="padding-mobile" style="padding:28px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{CTA_VAR}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="15%" stroke="f" fillcolor="{CTA_FILL}"><w:anchorlock/><center><![endif]-->
<a href="{CTA_VAR}" target="_blank" style="display:inline-block;background:{CTA_BG};color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:0.2px;box-shadow:0 4px 14px {CTA_SHADOW},0 2px 6px {CTA_SHADOW};mso-padding-alt:0;text-underline-color:{CTA_FILL};">
<!--[if mso]><i style="letter-spacing:48px;mso-font-width:-100%;mso-text-raise:24pt">&nbsp;</i><![endif]-->
<span style="mso-text-raise:12pt;">{CTA_TEXT}</span>
<!--[if mso]><i style="letter-spacing:48px;mso-font-width:-100%">&nbsp;</i><![endif]-->
</a><!--[if mso]></center></v:roundrect><![endif]-->
</td></tr></table></td></tr>

{NOTICE}

<tr><td class="padding-mobile" style="padding:28px 44px 0;">
<div style="height:1px;background:linear-gradient(90deg,transparent,#e5e7eb 20%,#e5e7eb 80%,transparent);"></div></td></tr>

<tr><td class="padding-mobile" style="padding:20px 44px 32px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:top;padding-right:10px;"><span style="font-size:14px;">&#128737;</span></td>
<td><p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">{NOTE}</p></td></tr></table></td></tr>

</table></td></tr>

<tr><td style="padding:28px 20px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td align="center">
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;"><strong style="color:#6b7280;">Central Bank of Nigeria</strong></p>
<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;line-height:1.5;">Information Technology Department</p></td></tr>
<tr><td align="center" style="padding-top:16px;"><div style="height:1px;width:40px;background:#d1d5db;margin:0 auto;"></div></td></tr>
<tr><td align="center" style="padding:12px 0 0;">
<p style="margin:0;font-size:10px;color:#c0c5ce;line-height:1.5;">This is an automated message from ITD-OPMS. Please do not reply directly.</p>
<p style="margin:4px 0 0;font-size:10px;color:#c0c5ce;">&copy; 2025 Central Bank of Nigeria. All rights reserved.</p>
</td></tr></table></td></tr>

</table></td></tr></table></div></body></html>$tpl$;

  tpl := replace(tpl, '{ACCENT}', p_accent);
  tpl := replace(tpl, '{ICON_BG}', p_icon_bg);
  tpl := replace(tpl, '{ICON}', p_icon);
  tpl := replace(tpl, '{TITLE}', p_title);
  tpl := replace(tpl, '{SUBTITLE}', p_subtitle);
  tpl := replace(tpl, '{MESSAGE}', p_message);
  tpl := replace(tpl, '{INFO_HTML}', p_info_html);
  tpl := replace(tpl, '{INFO_BG}', p_info_bg);
  tpl := replace(tpl, '{INFO_BORDER}', p_info_border);
  tpl := replace(tpl, '{EXTRA}', p_extra);
  tpl := replace(tpl, '{CTA_TEXT}', p_cta_text);
  tpl := replace(tpl, '{CTA_VAR}', p_cta_var);
  tpl := replace(tpl, '{CTA_BG}', p_cta_bg);
  tpl := replace(tpl, '{CTA_FILL}', p_cta_fill);
  tpl := replace(tpl, '{CTA_SHADOW}', p_cta_shadow);
  tpl := replace(tpl, '{NOTICE}', p_notice);
  tpl := replace(tpl, '{NOTE}', p_note);
  RETURN tpl;
END;
$fn$;
-- +goose StatementEnd

-- ============================================================
-- 1. SLA Breach Warning (ITSM) — Amber theme
--    Go template fields: .TicketRef, .Priority, .TargetTime, .TimeRemaining, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#78350F 0%,#D97706 30%,#F59E0B 70%,#FBBF24 100%)',
  '&#9888;',
  'linear-gradient(135deg,rgba(217,119,6,0.08),rgba(245,158,11,0.12))',
  'SLA Breach Warning',
  'A ticket is approaching its SLA breach threshold.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Ticket <strong>{{.TicketRef}}</strong> is approaching its SLA breach threshold and requires your immediate attention.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#92400E;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ticket</span><br>
<span style="font-size:14px;color:#78350F;font-weight:600;">{{.TicketRef}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#92400E;">Priority: <strong>{{.Priority}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#92400E;">SLA Target: <strong>{{.TargetTime}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#92400E;">Time Remaining: <strong style="color:#D97706;">{{.TimeRemaining}}</strong></span></td></tr>
</table>',
  '#FFFBEB', '1px solid #FDE68A',
  '<tr><td class="padding-mobile" style="padding:16px 44px 0;">
<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Please take action to resolve or escalate this ticket before the SLA is breached.</p></td></tr>',
  'View Ticket &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#D97706,#F59E0B)', '#D97706', 'rgba(217,119,6,0.3)',
  '<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;">
<tr><td style="padding:12px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:middle;padding-right:10px;"><span style="font-size:16px;">&#9200;</span></td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#92400e;line-height:1.4;">This ticket requires <strong>immediate attention</strong> to prevent SLA breach.</p></td></tr>
</table></td></tr></table></td></tr>',
  '<strong style="color:#6b7280;">Automated SLA Monitoring</strong> &mdash; This alert is generated when tickets approach their SLA thresholds. If the ticket has already been resolved, you can safely ignore this notification.'
) WHERE key = 'sla_breach_warning';

-- ============================================================
-- 2. SLA Breach Notification (ITSM) — Red theme
--    Go template fields: .TicketRef, .Priority, .BreachedAt, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#7F1D1D 0%,#DC2626 30%,#EF4444 70%,#F87171 100%)',
  '&#128680;',
  'linear-gradient(135deg,rgba(220,38,38,0.08),rgba(239,68,68,0.12))',
  'SLA Breached',
  'A ticket has exceeded its SLA target.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">The SLA target for ticket <strong>{{.TicketRef}}</strong> has been <strong style="color:#EF4444;">breached</strong>. Immediate remedial action is required.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#991B1B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ticket</span><br>
<span style="font-size:14px;color:#7F1D1D;font-weight:600;">{{.TicketRef}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Priority: <strong>{{.Priority}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Breached At: <strong style="color:#DC2626;">{{.BreachedAt}}</strong></span></td></tr>
</table>',
  '#FEF2F2', '2px solid #FECACA',
  '<tr><td class="padding-mobile" style="padding:16px 44px 0;">
<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">This incident will be recorded in the SLA compliance report. Please resolve or document the root cause.</p></td></tr>',
  'View Ticket &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#DC2626,#EF4444)', '#DC2626', 'rgba(220,38,38,0.3)',
  '',
  '<strong style="color:#6b7280;">SLA Compliance</strong> &mdash; This breach has been automatically logged. The SLA compliance team will review all breaches in the next reporting cycle.'
) WHERE key = 'sla_breach_notification';

-- ============================================================
-- 3. Approval Request (Governance) — Green theme
--    Go template fields: .EntityType, .EntityTitle, .RequesterName, .Description, .ApproveURL, .RejectURL, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#0d5c2e 0%,#1B7340 30%,#22c55e 70%,#4ade80 100%)',
  '&#9989;',
  'linear-gradient(135deg,rgba(27,115,64,0.08),rgba(34,197,94,0.12))',
  'Approval Required',
  'An item requires your review and decision.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;"><strong>{{.RequesterName}}</strong> has requested your approval for the following item. Your review and decision are requested at your earliest convenience.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">{{.EntityType}}</span><br>
<span style="font-size:14px;color:#14532D;font-weight:600;">{{.EntityTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#166534;">Priority: <strong>{{.Priority}}</strong></span></td></tr>
</table>',
  '#F0FDF4', '1px solid #BBF7D0',
  '<tr><td class="padding-mobile" style="padding:16px 44px 0;">
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">Description:</p>
<div style="padding:14px 18px;background:#f8fafb;border:1px solid #e5e7eb;border-radius:10px;">
<p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">{{.Description}}</p></div></td></tr>',
  'Review &amp; Approve &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#1B7340,#16a34a)', '#1B7340', 'rgba(27,115,64,0.3)',
  '',
  '<strong style="color:#6b7280;">Governance Workflow</strong> &mdash; This approval request is part of the ITD-OPMS governance process. Please review and provide your decision in a timely manner.'
) WHERE key = 'approval_request';

-- ============================================================
-- 4. Assignment Notification (ITSM) — Blue theme
--    Go template fields: .EntityType, .EntityTitle, .Priority, .AssignerName, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#1E3A5F 0%,#2563EB 30%,#3B82F6 70%,#60A5FA 100%)',
  '&#128203;',
  'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(59,130,246,0.12))',
  'New Assignment',
  'A new item has been assigned for your attention.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">You have been assigned to the following item by <strong>{{.AssignerName}}</strong>. Please review and begin working on it.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#1E40AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">{{.EntityType}}</span><br>
<span style="font-size:14px;color:#1E3A5F;font-weight:600;">{{.EntityTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#1E40AF;">Priority: <strong style="color:#2563EB;">{{.Priority}}</strong></span></td></tr>
</table>',
  '#EFF6FF', '1px solid #BFDBFE',
  '',
  'View Details &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#2563EB,#3B82F6)', '#2563EB', 'rgba(37,99,235,0.3)',
  '',
  '<strong style="color:#6b7280;">Ticket Assignment</strong> &mdash; You have been assigned as the responsible agent. Please acknowledge and respond within the SLA response window.'
) WHERE key = 'assignment_notification';

-- ============================================================
-- 5. Escalation Notification (ITSM) — Dark Red theme
--    Go template fields: .TicketRef, .EscalationLevel, .Reason, .PreviousOwner, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#450a0a 0%,#991B1B 30%,#DC2626 70%,#EF4444 100%)',
  '&#11014;',
  'linear-gradient(135deg,rgba(153,27,27,0.08),rgba(220,38,38,0.12))',
  'Ticket Escalation Notice',
  'A ticket has been escalated and requires your prompt attention.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Ticket <strong>{{.TicketRef}}</strong> has been escalated to <strong>{{.EscalationLevel}}</strong>. Your prompt attention is required.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#991B1B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Ticket</span><br>
<span style="font-size:14px;color:#7F1D1D;font-weight:600;">{{.TicketRef}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Escalation Level: <strong>{{.EscalationLevel}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Reason: <strong>{{.Reason}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Previous Owner: <strong>{{.PreviousOwner}}</strong></span></td></tr>
</table>',
  '#FEF2F2', '2px solid #FECACA',
  '',
  'View Escalated Ticket &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#991B1B,#DC2626)', '#991B1B', 'rgba(153,27,27,0.3)',
  '<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;">
<tr><td style="padding:12px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:middle;padding-right:10px;"><span style="font-size:16px;">&#9888;</span></td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#991B1B;line-height:1.4;">This escalation will be tracked in the service management report.</p></td></tr>
</table></td></tr></table></td></tr>',
  '<strong style="color:#6b7280;">Escalation Management</strong> &mdash; This ticket has been escalated per ITSM escalation policy. Please respond promptly to prevent further escalation.'
) WHERE key = 'escalation_notification';

-- ============================================================
-- 6. License / Warranty Renewal Reminder (CMDB) — Purple theme
--    Go template fields: .AssetName, .RenewalType, .ExpiryDate, .Vendor, .EstimatedCost, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#4C1D95 0%,#7C3AED 30%,#8B5CF6 70%,#A78BFA 100%)',
  '&#128197;',
  'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(139,92,246,0.12))',
  'Renewal Reminder',
  'A license or warranty is approaching its expiry date.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">The {{.RenewalType}} for <strong>{{.AssetName}}</strong> is approaching its expiry date. Please initiate the renewal process to ensure continued coverage.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#5B21B6;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Asset</span><br>
<span style="font-size:14px;color:#4C1D95;font-weight:600;">{{.AssetName}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#5B21B6;">Type: <strong>{{.RenewalType}}</strong> &middot; Vendor: <strong>{{.Vendor}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#5B21B6;">Expiry Date: <strong style="color:#7C3AED;">{{.ExpiryDate}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#5B21B6;">Estimated Cost: <strong>{{.EstimatedCost}}</strong></span></td></tr>
</table>',
  '#F5F3FF', '1px solid #DDD6FE',
  '',
  'Manage Renewal &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#7C3AED,#8B5CF6)', '#7C3AED', 'rgba(124,58,237,0.3)',
  '<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:10px;">
<tr><td style="padding:12px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:middle;padding-right:10px;"><span style="font-size:16px;">&#9200;</span></td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#5B21B6;line-height:1.4;">Please initiate the procurement process to avoid service disruption.</p></td></tr>
</table></td></tr></table></td></tr>',
  '<strong style="color:#6b7280;">Asset Management</strong> &mdash; This reminder is generated automatically based on the asset''s expiry date in the CMDB.'
) WHERE key = 'license_renewal_reminder';

-- ============================================================
-- 7. Audit Evidence Request (GRC) — Teal/Cyan theme
--    Go template fields: .AuditTitle, .EvidenceType, .DueDate, .RequesterName, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#134E4A 0%,#0891B2 30%,#06B6D4 70%,#22D3EE 100%)',
  '&#128203;',
  'linear-gradient(135deg,rgba(8,145,178,0.08),rgba(6,182,212,0.12))',
  'Audit Evidence Request',
  'Evidence is required for a compliance audit.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">As part of the <strong>{{.AuditTitle}}</strong> audit, you are requested to provide evidence. Requested by <strong>{{.RequesterName}}</strong>.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#155E75;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Audit</span><br>
<span style="font-size:14px;color:#134E4A;font-weight:600;">{{.AuditTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#155E75;">Evidence Type: <strong>{{.EvidenceType}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#155E75;">Due Date: <strong style="color:#0891B2;">{{.DueDate}}</strong></span></td></tr>
</table>',
  '#ECFEFF', '1px solid #A5F3FC',
  '',
  'Upload Evidence &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#0891B2,#06B6D4)', '#0891B2', 'rgba(8,145,178,0.3)',
  '',
  '<strong style="color:#6b7280;">GRC Compliance</strong> &mdash; Timely submission of audit evidence is critical for regulatory compliance. Late submissions may be flagged in the audit report.'
) WHERE key = 'audit_evidence_request';

-- ============================================================
-- 8. Major Incident (ITSM) — Deep Red theme
--    Go template fields: .IncidentTitle, .Priority, .Status, .Impact, .Description, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#450a0a 0%,#7F1D1D 30%,#DC2626 70%,#EF4444 100%)',
  '&#128680;',
  'linear-gradient(135deg,rgba(127,29,29,0.08),rgba(220,38,38,0.12))',
  'Major Incident Declared',
  'All relevant personnel are required to join the response immediately.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">A <strong style="color:#DC2626;">Major Incident</strong> has been declared. All relevant personnel are required to join the response immediately.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#991B1B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Incident</span><br>
<span style="font-size:14px;color:#7F1D1D;font-weight:600;">{{.IncidentTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Priority: <strong>P{{.Priority}}</strong> &middot; Status: <strong>{{.Status}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Impact: <strong>{{.Impact}}</strong></span></td></tr>
</table>',
  '#FEF2F2', '2px solid #EF4444',
  '<tr><td class="padding-mobile" style="padding:16px 44px 0;">
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#374151;">Description:</p>
<div style="padding:14px 18px;background:#f8fafb;border:1px solid #e5e7eb;border-radius:10px;">
<p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">{{.Description}}</p></div></td></tr>',
  'Join Incident Response &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#7F1D1D,#DC2626)', '#7F1D1D', 'rgba(127,29,29,0.3)',
  '<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;">
<tr><td style="padding:12px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:middle;padding-right:10px;"><span style="font-size:16px;">&#128680;</span></td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#991B1B;line-height:1.4;"><strong>MAJOR INCIDENT</strong> &mdash; This requires immediate response from all assigned personnel.</p></td></tr>
</table></td></tr></table></td></tr>',
  '<strong style="color:#6b7280;">Incident Management</strong> &mdash; This is a Priority 1 notification. All communications and actions will be logged in the incident timeline.'
) WHERE key = 'major_incident';

-- ============================================================
-- 9. Action Item Due Reminder (Governance) — Blue theme
--    Go template fields: .ActionTitle, .DueDate, .OwnerName, .RelatedEntity, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#1E3A5F 0%,#2563EB 30%,#3B82F6 70%,#60A5FA 100%)',
  '&#9200;',
  'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(59,130,246,0.12))',
  'Action Item Reminder',
  'An action item assigned to you is due soon.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Your action item is approaching its due date and requires attention.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#1E40AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Action Item</span><br>
<span style="font-size:14px;color:#1E3A5F;font-weight:600;">{{.ActionTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#1E40AF;">Due Date: <strong style="color:#2563EB;">{{.DueDate}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#1E40AF;">Owner: <strong>{{.OwnerName}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#1E40AF;">Related To: <strong>{{.RelatedEntity}}</strong></span></td></tr>
</table>',
  '#EFF6FF', '1px solid #BFDBFE',
  '',
  'View Action Item &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#2563EB,#3B82F6)', '#2563EB', 'rgba(37,99,235,0.3)',
  '',
  '<strong style="color:#6b7280;">Governance Tracking</strong> &mdash; Action items are tracked for governance compliance. Please update the status once completed.'
) WHERE key = 'action_due_reminder';

-- ============================================================
-- 10. Action Item Overdue (Governance) — Orange theme
--    Go template fields: .ActionTitle, .DueDate, .DaysOverdue, .OwnerName, .RelatedEntity, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#7C2D12 0%,#EA580C 30%,#F97316 70%,#FB923C 100%)',
  '&#9888;',
  'linear-gradient(135deg,rgba(234,88,12,0.08),rgba(249,115,22,0.12))',
  'Action Item Overdue',
  'An action item has passed its due date.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">The following action item is <strong style="color:#EA580C;">overdue</strong> and requires immediate attention.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#9A3412;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Action Item</span><br>
<span style="font-size:14px;color:#7C2D12;font-weight:600;">{{.ActionTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#9A3412;">Was Due: <strong>{{.DueDate}}</strong> &middot; Days Overdue: <strong style="color:#EA580C;">{{.DaysOverdue}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#9A3412;">Owner: <strong>{{.OwnerName}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#9A3412;">Related To: <strong>{{.RelatedEntity}}</strong></span></td></tr>
</table>',
  '#FFF7ED', '1px solid #FED7AA',
  '',
  'Take Action Now &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#EA580C,#F97316)', '#EA580C', 'rgba(234,88,12,0.3)',
  '<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(234,88,12,0.06);border:1px solid rgba(234,88,12,0.15);border-radius:10px;">
<tr><td style="padding:12px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:middle;padding-right:10px;"><span style="font-size:16px;">&#9888;</span></td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#9A3412;line-height:1.4;">Continued delays may result in escalation to management.</p></td></tr>
</table></td></tr></table></td></tr>',
  '<strong style="color:#6b7280;">Governance Compliance</strong> &mdash; Overdue action items are flagged in the governance compliance dashboard and may be escalated if not resolved.'
) WHERE key = 'action_overdue_reminder';

-- ============================================================
-- 11. Action Item Critical Overdue (Governance) — Deep Red theme
--    Go template fields: .ActionTitle, .DueDate, .DaysOverdue, .OwnerName, .EscalateTo, .RelatedEntity, .ActionURL
-- ============================================================
UPDATE notification_templates SET body_template = _premium_ntpl(
  'linear-gradient(90deg,#450a0a 0%,#991B1B 30%,#DC2626 70%,#EF4444 100%)',
  '&#128680;',
  'linear-gradient(135deg,rgba(153,27,27,0.08),rgba(220,38,38,0.12))',
  'Critical: Action Item Severely Overdue',
  'This item has been escalated due to severe delay.',
  '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">This action item is <strong style="color:#DC2626;">critically overdue</strong> and has been escalated for immediate resolution.</p>',
  '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td style="padding:4px 0"><span style="font-size:12px;color:#991B1B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Action Item</span><br>
<span style="font-size:14px;color:#7F1D1D;font-weight:600;">{{.ActionTitle}}</span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Was Due: <strong>{{.DueDate}}</strong> &middot; Days Overdue: <strong style="color:#DC2626;">{{.DaysOverdue}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Owner: <strong>{{.OwnerName}}</strong> &middot; Escalated To: <strong>{{.EscalateTo}}</strong></span></td></tr>
<tr><td style="padding:4px 0"><span style="font-size:13px;color:#991B1B;">Related To: <strong>{{.RelatedEntity}}</strong></span></td></tr>
</table>',
  '#FEF2F2', '2px solid #EF4444',
  '<tr><td class="padding-mobile" style="padding:16px 44px 0;">
<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Please resolve this item immediately or provide a documented justification for the delay.</p></td></tr>',
  'Resolve Immediately &rarr;', '{{.ActionURL}}',
  'linear-gradient(135deg,#991B1B,#DC2626)', '#991B1B', 'rgba(153,27,27,0.3)',
  '<tr><td class="padding-mobile" style="padding:20px 44px 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;">
<tr><td style="padding:12px 16px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="vertical-align:middle;padding-right:10px;"><span style="font-size:16px;">&#128680;</span></td>
<td style="vertical-align:middle;"><p style="margin:0;font-size:13px;color:#991B1B;line-height:1.4;"><strong>ESCALATED</strong> &mdash; This item has been flagged for management review.</p></td></tr>
</table></td></tr></table></td></tr>',
  '<strong style="color:#6b7280;">Critical Escalation</strong> &mdash; This notification is sent to both the assignee and their manager. Immediate resolution or justification is required.'
) WHERE key = 'action_critical_overdue';

-- Also update the email_templates table to keep them in sync for admin UI previews.
-- (These don't affect actual delivery but keep the admin interface consistent.)
UPDATE email_templates SET body_html = (
  SELECT body_template FROM notification_templates WHERE key = email_templates.name
) WHERE name IN (
  'sla_breach_warning', 'sla_breach_notification', 'approval_request',
  'assignment_notification', 'escalation_notification', 'license_renewal_reminder',
  'audit_evidence_request', 'major_incident', 'action_due_reminder',
  'action_overdue_reminder', 'action_critical_overdue'
) AND EXISTS (
  SELECT 1 FROM notification_templates WHERE key = email_templates.name
);

-- Clean up helper function
DROP FUNCTION _premium_ntpl;


-- +goose Down
-- Restore original bare-HTML templates from migrations 006 and 061.

UPDATE notification_templates SET body_template =
  '<h2>SLA Breach Warning</h2><p>Ticket <strong>{{.TicketRef}}</strong> is approaching its SLA deadline.</p><p><strong>Priority:</strong> {{.Priority}}<br/><strong>Target:</strong> {{.TargetTime}}<br/><strong>Remaining:</strong> {{.TimeRemaining}}</p><p><a href="{{.ActionURL}}">View Ticket</a></p>'
WHERE key = 'sla_breach_warning';

UPDATE notification_templates SET body_template =
  '<h2 style="color:#dc2626">SLA Breached</h2><p>Ticket <strong>{{.TicketRef}}</strong> has breached its SLA.</p><p><strong>Priority:</strong> {{.Priority}}<br/><strong>Breached At:</strong> {{.BreachedAt}}</p><p><a href="{{.ActionURL}}">Take Action</a></p>'
WHERE key = 'sla_breach_notification';

UPDATE notification_templates SET body_template =
  '<h2>Approval Required</h2><p>{{.RequesterName}} has requested your approval for:</p><p><strong>{{.EntityType}}:</strong> {{.EntityTitle}}</p><p>{{.Description}}</p><p><a href="{{.ApproveURL}}">Approve</a> | <a href="{{.RejectURL}}">Reject</a> | <a href="{{.ActionURL}}">View Details</a></p>'
WHERE key = 'approval_request';

UPDATE notification_templates SET body_template =
  '<h2>New Assignment</h2><p>You have been assigned to:</p><p><strong>{{.EntityType}}:</strong> {{.EntityTitle}}<br/><strong>Priority:</strong> {{.Priority}}<br/><strong>Assigned By:</strong> {{.AssignerName}}</p><p><a href="{{.ActionURL}}">View Details</a></p>'
WHERE key = 'assignment_notification';

UPDATE notification_templates SET body_template =
  '<h2>Ticket Escalated</h2><p>Ticket <strong>{{.TicketRef}}</strong> has been escalated to {{.EscalationLevel}}.</p><p><strong>Reason:</strong> {{.Reason}}<br/><strong>Previous Owner:</strong> {{.PreviousOwner}}</p><p><a href="{{.ActionURL}}">View Ticket</a></p>'
WHERE key = 'escalation_notification';

UPDATE notification_templates SET body_template =
  '<h2>Renewal Reminder</h2><p>The {{.RenewalType}} for <strong>{{.AssetName}}</strong> is expiring soon.</p><p><strong>Expiry Date:</strong> {{.ExpiryDate}}<br/><strong>Vendor:</strong> {{.Vendor}}<br/><strong>Cost:</strong> {{.EstimatedCost}}</p><p><a href="{{.ActionURL}}">Manage Renewal</a></p>'
WHERE key = 'license_renewal_reminder';

UPDATE notification_templates SET body_template =
  '<h2>Evidence Collection Request</h2><p>Evidence is required for audit <strong>{{.AuditTitle}}</strong>.</p><p><strong>Evidence Type:</strong> {{.EvidenceType}}<br/><strong>Due Date:</strong> {{.DueDate}}<br/><strong>Requested By:</strong> {{.RequesterName}}</p><p><a href="{{.ActionURL}}">Upload Evidence</a></p>'
WHERE key = 'audit_evidence_request';

UPDATE notification_templates SET body_template =
  '<h2 style="color:#dc2626">Major Incident</h2><p><strong>Incident:</strong> {{.IncidentTitle}}<br/><strong>Priority:</strong> P{{.Priority}}<br/><strong>Status:</strong> {{.Status}}<br/><strong>Impact:</strong> {{.Impact}}</p><p>{{.Description}}</p><p><a href="{{.ActionURL}}">Incident Details</a></p>'
WHERE key = 'major_incident';

UPDATE notification_templates SET body_template =
  '<h2>Action Item Due Soon</h2><p>Your action item is approaching its due date and requires attention.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;color:#666;font-weight:600">Action</td><td style="padding:8px">{{.ActionTitle}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Due Date</td><td style="padding:8px;color:#D97706">{{.DueDate}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Owner</td><td style="padding:8px">{{.OwnerName}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Related To</td><td style="padding:8px">{{.RelatedEntity}}</td></tr></table><p><a href="{{.ActionURL}}" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:6px;text-decoration:none">View Action Item</a></p>'
WHERE key = 'action_due_reminder';

UPDATE notification_templates SET body_template =
  '<h2 style="color:#DC2626">Action Item Overdue</h2><p>The following action item is overdue and requires immediate attention.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;color:#666;font-weight:600">Action</td><td style="padding:8px">{{.ActionTitle}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Was Due</td><td style="padding:8px;color:#DC2626">{{.DueDate}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Days Overdue</td><td style="padding:8px;color:#DC2626">{{.DaysOverdue}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Owner</td><td style="padding:8px">{{.OwnerName}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Related To</td><td style="padding:8px">{{.RelatedEntity}}</td></tr></table><p><a href="{{.ActionURL}}" style="display:inline-block;padding:10px 20px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none">Take Action Now</a></p>'
WHERE key = 'action_overdue_reminder';

UPDATE notification_templates SET body_template =
  '<h2 style="color:#7F1D1D">Critical: Action Item Severely Overdue</h2><p style="color:#7F1D1D;font-weight:600">This action item is critically overdue and is escalated for immediate resolution.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #FCA5A5;border-radius:6px"><tr style="background:#FEF2F2"><td style="padding:8px;color:#666;font-weight:600">Action</td><td style="padding:8px;font-weight:600">{{.ActionTitle}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Was Due</td><td style="padding:8px;color:#DC2626">{{.DueDate}}</td></tr><tr style="background:#FEF2F2"><td style="padding:8px;color:#666;font-weight:600">Days Overdue</td><td style="padding:8px;color:#DC2626;font-weight:600">{{.DaysOverdue}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Owner</td><td style="padding:8px">{{.OwnerName}}</td></tr><tr style="background:#FEF2F2"><td style="padding:8px;color:#666;font-weight:600">Escalated To</td><td style="padding:8px">{{.EscalateTo}}</td></tr><tr><td style="padding:8px;color:#666;font-weight:600">Related To</td><td style="padding:8px">{{.RelatedEntity}}</td></tr></table><p><a href="{{.ActionURL}}" style="display:inline-block;padding:10px 20px;background:#7F1D1D;color:#fff;border-radius:6px;text-decoration:none">Resolve Immediately</a></p>'
WHERE key = 'action_critical_overdue';

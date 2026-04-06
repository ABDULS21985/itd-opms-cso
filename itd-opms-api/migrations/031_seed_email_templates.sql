-- +goose Up
-- Seed 20 professional email templates across all modules.
-- tenant_id = NULL means these are global/default templates.

INSERT INTO email_templates (tenant_id, name, subject, body_html, body_text, variables, category, is_active) VALUES

-- ============================================================
-- 1. SLA Breach Warning (ITSM)
-- ============================================================
(NULL, 'sla_breach_warning',
 'SLA Warning: {{ticketRef}} approaching breach threshold',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#F59E0B;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">SLA Breach Warning</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Ticket <strong>{{ticketRef}}</strong> is approaching its SLA breach threshold and requires your immediate attention.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#92400E;font-size:13px"><strong>Ticket:</strong> {{ticketRef}} &mdash; {{ticketTitle}}</td></tr>
      <tr><td style="color:#92400E;font-size:13px"><strong>Priority:</strong> {{priority}} &nbsp;|&nbsp; <strong>SLA Target:</strong> {{slaTarget}}</td></tr>
      <tr><td style="color:#92400E;font-size:13px"><strong>Time Remaining:</strong> {{timeRemaining}}</td></tr>
    </table>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6">Please take action to resolve or escalate this ticket before the SLA is breached.</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#F59E0B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Ticket</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'SLA BREACH WARNING\n\nDear {{recipientName}},\n\nTicket {{ticketRef}} ({{ticketTitle}}) is approaching its SLA breach threshold.\n\nPriority: {{priority}}\nSLA Target: {{slaTarget}}\nTime Remaining: {{timeRemaining}}\n\nPlease take action to resolve or escalate before breach.\n\nView ticket: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Recipient display name"},{"name":"ticketRef","description":"Ticket reference number"},{"name":"ticketTitle","description":"Ticket title"},{"name":"priority","description":"Ticket priority"},{"name":"slaTarget","description":"SLA target time"},{"name":"timeRemaining","description":"Time remaining before breach"},{"name":"actionUrl","description":"Link to view ticket"}]',
 'itsm', true),

-- ============================================================
-- 2. SLA Breach Notification (ITSM)
-- ============================================================
(NULL, 'sla_breach_notification',
 'SLA BREACHED: {{ticketRef}} has exceeded its target',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#EF4444;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">SLA Breached</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">The SLA target for ticket <strong>{{ticketRef}}</strong> has been <span style="color:#EF4444;font-weight:600">breached</span>. Immediate remedial action is required.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#991B1B;font-size:13px"><strong>Ticket:</strong> {{ticketRef}} &mdash; {{ticketTitle}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Priority:</strong> {{priority}} &nbsp;|&nbsp; <strong>SLA Target:</strong> {{slaTarget}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Breached At:</strong> {{breachedAt}} &nbsp;|&nbsp; <strong>Overdue By:</strong> {{overdueBy}}</td></tr>
    </table>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6">This incident will be recorded in the SLA compliance report. Please resolve or document the root cause.</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#EF4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Ticket</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'SLA BREACHED\n\nDear {{recipientName}},\n\nThe SLA for ticket {{ticketRef}} ({{ticketTitle}}) has been breached.\n\nPriority: {{priority}}\nSLA Target: {{slaTarget}}\nBreached At: {{breachedAt}}\nOverdue By: {{overdueBy}}\n\nImmediate action required.\n\nView ticket: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Recipient display name"},{"name":"ticketRef","description":"Ticket reference number"},{"name":"ticketTitle","description":"Ticket title"},{"name":"priority","description":"Ticket priority"},{"name":"slaTarget","description":"SLA target time"},{"name":"breachedAt","description":"Time of SLA breach"},{"name":"overdueBy","description":"Duration overdue"},{"name":"actionUrl","description":"Link to view ticket"}]',
 'itsm', true),

-- ============================================================
-- 3. Approval Request (Governance)
-- ============================================================
(NULL, 'approval_request',
 'Approval Required: {{entityTitle}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1B7340;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Approval Required</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">You have been designated as an approver for the following item. Your review and decision are requested at your earliest convenience.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#166534;font-size:13px"><strong>Item:</strong> {{entityTitle}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Type:</strong> {{entityType}} &nbsp;|&nbsp; <strong>Submitted By:</strong> {{submittedBy}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Submitted On:</strong> {{submittedAt}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Summary:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{summary}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#1B7340;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Review &amp; Approve</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'APPROVAL REQUIRED\n\nDear {{recipientName}},\n\nYou have been designated as an approver for:\n\nItem: {{entityTitle}}\nType: {{entityType}}\nSubmitted By: {{submittedBy}}\nDate: {{submittedAt}}\n\nSummary: {{summary}}\n\nReview: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Approver display name"},{"name":"entityTitle","description":"Title of the item requiring approval"},{"name":"entityType","description":"Type of entity (policy, change request, etc.)"},{"name":"submittedBy","description":"Name of the submitter"},{"name":"submittedAt","description":"Submission date"},{"name":"summary","description":"Brief summary of the item"},{"name":"actionUrl","description":"Link to review the item"}]',
 'governance', true),

-- ============================================================
-- 4. Assignment Notification (ITSM)
-- ============================================================
(NULL, 'assignment_notification',
 'Ticket Assigned: {{ticketRef}} - {{ticketTitle}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#3B82F6;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Ticket Assigned to You</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">A ticket has been assigned to you by <strong>{{assignedBy}}</strong>. Please review and begin working on it.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#1E40AF;font-size:13px"><strong>Ticket:</strong> {{ticketRef}} &mdash; {{ticketTitle}}</td></tr>
      <tr><td style="color:#1E40AF;font-size:13px"><strong>Priority:</strong> {{priority}} &nbsp;|&nbsp; <strong>Category:</strong> {{category}}</td></tr>
      <tr><td style="color:#1E40AF;font-size:13px"><strong>SLA Response Due:</strong> {{slaResponseDue}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Description:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{description}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#3B82F6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open Ticket</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'TICKET ASSIGNED\n\nDear {{recipientName}},\n\nTicket {{ticketRef}} ({{ticketTitle}}) has been assigned to you by {{assignedBy}}.\n\nPriority: {{priority}}\nCategory: {{category}}\nSLA Response Due: {{slaResponseDue}}\n\nDescription:\n{{description}}\n\nOpen ticket: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Assignee display name"},{"name":"ticketRef","description":"Ticket reference number"},{"name":"ticketTitle","description":"Ticket title"},{"name":"assignedBy","description":"Person who assigned the ticket"},{"name":"priority","description":"Ticket priority"},{"name":"category","description":"Ticket category"},{"name":"slaResponseDue","description":"SLA response deadline"},{"name":"description","description":"Ticket description excerpt"},{"name":"actionUrl","description":"Link to view ticket"}]',
 'itsm', true),

-- ============================================================
-- 5. Escalation Notification (ITSM)
-- ============================================================
(NULL, 'escalation_notification',
 'Escalation: {{ticketRef}} has been escalated to {{escalationLevel}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#DC2626;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Ticket Escalation Notice</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Ticket <strong>{{ticketRef}}</strong> has been escalated to <strong>{{escalationLevel}}</strong>. Your prompt attention is required.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#991B1B;font-size:13px"><strong>Ticket:</strong> {{ticketRef}} &mdash; {{ticketTitle}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Priority:</strong> {{priority}} &nbsp;|&nbsp; <strong>Escalation Level:</strong> {{escalationLevel}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Escalated By:</strong> {{escalatedBy}} &nbsp;|&nbsp; <strong>Reason:</strong> {{reason}}</td></tr>
    </table>
    <a href="{{actionUrl}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Escalated Ticket</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'TICKET ESCALATION\n\nDear {{recipientName}},\n\nTicket {{ticketRef}} ({{ticketTitle}}) has been escalated to {{escalationLevel}}.\n\nPriority: {{priority}}\nEscalated By: {{escalatedBy}}\nReason: {{reason}}\n\nView ticket: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Recipient display name"},{"name":"ticketRef","description":"Ticket reference number"},{"name":"ticketTitle","description":"Ticket title"},{"name":"priority","description":"Ticket priority"},{"name":"escalationLevel","description":"Escalation level (L2, L3, Management)"},{"name":"escalatedBy","description":"Person who escalated"},{"name":"reason","description":"Escalation reason"},{"name":"actionUrl","description":"Link to view ticket"}]',
 'itsm', true),

-- ============================================================
-- 6. Major Incident Notification (ITSM)
-- ============================================================
(NULL, 'major_incident',
 'MAJOR INCIDENT: {{ticketRef}} - {{ticketTitle}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#7F1D1D;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Major Incident Declared</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">A <strong style="color:#DC2626">Major Incident</strong> has been declared. All relevant personnel are required to join the response immediately.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FEF2F2;border:2px solid #EF4444;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#991B1B;font-size:13px"><strong>Incident:</strong> {{ticketRef}} &mdash; {{ticketTitle}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Severity:</strong> {{severity}} &nbsp;|&nbsp; <strong>Impact:</strong> {{impact}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Affected Services:</strong> {{affectedServices}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Declared By:</strong> {{declaredBy}} &nbsp;|&nbsp; <strong>Time:</strong> {{declaredAt}}</td></tr>
    </table>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6"><strong>Initial Assessment:</strong><br>{{description}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Join Incident Response</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'MAJOR INCIDENT DECLARED\n\nDear {{recipientName}},\n\nA Major Incident has been declared.\n\nIncident: {{ticketRef}} - {{ticketTitle}}\nSeverity: {{severity}}\nImpact: {{impact}}\nAffected Services: {{affectedServices}}\nDeclared By: {{declaredBy}} at {{declaredAt}}\n\nAssessment:\n{{description}}\n\nJoin response: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Recipient display name"},{"name":"ticketRef","description":"Incident reference number"},{"name":"ticketTitle","description":"Incident title"},{"name":"severity","description":"Incident severity level"},{"name":"impact","description":"Business impact description"},{"name":"affectedServices","description":"Affected IT services"},{"name":"declaredBy","description":"Person who declared the major incident"},{"name":"declaredAt","description":"Time of declaration"},{"name":"description","description":"Initial assessment"},{"name":"actionUrl","description":"Link to incident war room"}]',
 'itsm', true),

-- ============================================================
-- 7. License / Warranty Renewal Reminder (CMDB)
-- ============================================================
(NULL, 'license_renewal_reminder',
 'Renewal Reminder: {{assetName}} {{renewalType}} expires on {{expiryDate}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#7C3AED;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Renewal Reminder</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">The {{renewalType}} for <strong>{{assetName}}</strong> is approaching its expiry date. Please initiate the renewal process to ensure continued coverage.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#5B21B6;font-size:13px"><strong>Asset:</strong> {{assetName}} ({{assetTag}})</td></tr>
      <tr><td style="color:#5B21B6;font-size:13px"><strong>Type:</strong> {{renewalType}} &nbsp;|&nbsp; <strong>Vendor:</strong> {{vendor}}</td></tr>
      <tr><td style="color:#5B21B6;font-size:13px"><strong>Expiry Date:</strong> {{expiryDate}} &nbsp;|&nbsp; <strong>Days Remaining:</strong> {{daysRemaining}}</td></tr>
      <tr><td style="color:#5B21B6;font-size:13px"><strong>Annual Cost:</strong> {{cost}}</td></tr>
    </table>
    <a href="{{actionUrl}}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Asset Details</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'RENEWAL REMINDER\n\nDear {{recipientName}},\n\nThe {{renewalType}} for {{assetName}} ({{assetTag}}) expires on {{expiryDate}}.\n\nVendor: {{vendor}}\nDays Remaining: {{daysRemaining}}\nAnnual Cost: {{cost}}\n\nPlease initiate renewal.\n\nView asset: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Asset owner or manager name"},{"name":"assetName","description":"Asset display name"},{"name":"assetTag","description":"Asset tag identifier"},{"name":"renewalType","description":"License or Warranty"},{"name":"vendor","description":"Vendor name"},{"name":"expiryDate","description":"Expiration date"},{"name":"daysRemaining","description":"Days until expiry"},{"name":"cost","description":"Annual renewal cost"},{"name":"actionUrl","description":"Link to asset details"}]',
 'cmdb', true),

-- ============================================================
-- 8. Audit Evidence Request (GRC)
-- ============================================================
(NULL, 'audit_evidence_request',
 'Evidence Required: {{auditTitle}} - {{controlRef}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#0891B2;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Audit Evidence Request</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">As part of the <strong>{{auditTitle}}</strong> audit, you are requested to provide evidence for the following control objective.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#ECFEFF;border:1px solid #A5F3FC;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#155E75;font-size:13px"><strong>Audit:</strong> {{auditTitle}}</td></tr>
      <tr><td style="color:#155E75;font-size:13px"><strong>Control:</strong> {{controlRef}} &mdash; {{controlTitle}}</td></tr>
      <tr><td style="color:#155E75;font-size:13px"><strong>Framework:</strong> {{framework}}</td></tr>
      <tr><td style="color:#155E75;font-size:13px"><strong>Evidence Due:</strong> {{dueDate}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Required Evidence:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{evidenceDescription}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#0891B2;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Upload Evidence</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'AUDIT EVIDENCE REQUEST\n\nDear {{recipientName}},\n\nEvidence is required for:\n\nAudit: {{auditTitle}}\nControl: {{controlRef}} - {{controlTitle}}\nFramework: {{framework}}\nDue: {{dueDate}}\n\nRequired: {{evidenceDescription}}\n\nUpload evidence: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Evidence owner name"},{"name":"auditTitle","description":"Audit title"},{"name":"controlRef","description":"Control reference code"},{"name":"controlTitle","description":"Control title"},{"name":"framework","description":"Compliance framework (ISO 27001, COBIT, etc.)"},{"name":"dueDate","description":"Evidence submission deadline"},{"name":"evidenceDescription","description":"Description of required evidence"},{"name":"actionUrl","description":"Link to upload evidence"}]',
 'grc', true),

-- ============================================================
-- 9. Action Item Due Reminder (Governance)
-- ============================================================
(NULL, 'action_due_reminder',
 'Reminder: Action item "{{actionTitle}}" is due on {{dueDate}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#2563EB;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Action Item Reminder</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">This is a friendly reminder that the following action item is due soon. Please ensure it is completed by the deadline.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#1E40AF;font-size:13px"><strong>Action:</strong> {{actionTitle}}</td></tr>
      <tr><td style="color:#1E40AF;font-size:13px"><strong>Source:</strong> {{sourceMeeting}} &nbsp;|&nbsp; <strong>Priority:</strong> {{priority}}</td></tr>
      <tr><td style="color:#1E40AF;font-size:13px"><strong>Due Date:</strong> {{dueDate}} &nbsp;|&nbsp; <strong>Days Remaining:</strong> {{daysRemaining}}</td></tr>
    </table>
    <a href="{{actionUrl}}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Action Item</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'ACTION ITEM REMINDER\n\nDear {{recipientName}},\n\nAction item "{{actionTitle}}" is due on {{dueDate}}.\n\nSource: {{sourceMeeting}}\nPriority: {{priority}}\nDays Remaining: {{daysRemaining}}\n\nView: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Assignee display name"},{"name":"actionTitle","description":"Action item title"},{"name":"sourceMeeting","description":"Originating meeting or decision"},{"name":"priority","description":"Action item priority"},{"name":"dueDate","description":"Due date"},{"name":"daysRemaining","description":"Days until deadline"},{"name":"actionUrl","description":"Link to action item"}]',
 'governance', true),

-- ============================================================
-- 10. Action Item Overdue (Governance)
-- ============================================================
(NULL, 'action_overdue_reminder',
 'OVERDUE: Action item "{{actionTitle}}" was due on {{dueDate}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#EA580C;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Action Item Overdue</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">The following action item has passed its due date and is now <strong style="color:#EA580C">overdue</strong>. Please complete it at your earliest opportunity or request an extension.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#9A3412;font-size:13px"><strong>Action:</strong> {{actionTitle}}</td></tr>
      <tr><td style="color:#9A3412;font-size:13px"><strong>Due Date:</strong> {{dueDate}} &nbsp;|&nbsp; <strong>Overdue By:</strong> {{daysOverdue}} days</td></tr>
      <tr><td style="color:#9A3412;font-size:13px"><strong>Source:</strong> {{sourceMeeting}} &nbsp;|&nbsp; <strong>Priority:</strong> {{priority}}</td></tr>
    </table>
    <a href="{{actionUrl}}" style="display:inline-block;background:#EA580C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Complete Action Item</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'ACTION ITEM OVERDUE\n\nDear {{recipientName}},\n\nAction item "{{actionTitle}}" was due on {{dueDate}} and is now {{daysOverdue}} days overdue.\n\nSource: {{sourceMeeting}}\nPriority: {{priority}}\n\nPlease complete or request extension.\n\nView: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Assignee display name"},{"name":"actionTitle","description":"Action item title"},{"name":"dueDate","description":"Original due date"},{"name":"daysOverdue","description":"Number of days overdue"},{"name":"sourceMeeting","description":"Originating meeting or decision"},{"name":"priority","description":"Action item priority"},{"name":"actionUrl","description":"Link to action item"}]',
 'governance', true),

-- ============================================================
-- 11. Action Item Critical Overdue (Governance)
-- ============================================================
(NULL, 'action_critical_overdue',
 'CRITICAL OVERDUE: Action "{{actionTitle}}" requires immediate attention',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#991B1B;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Critical: Action Item Severely Overdue</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">The following action item is <strong style="color:#DC2626">critically overdue</strong> and has been escalated. This will be flagged in the governance compliance report.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FEF2F2;border:2px solid #EF4444;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#991B1B;font-size:13px"><strong>Action:</strong> {{actionTitle}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Due Date:</strong> {{dueDate}} &nbsp;|&nbsp; <strong>Overdue By:</strong> {{daysOverdue}} days</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Assigned To:</strong> {{assigneeName}} &nbsp;|&nbsp; <strong>Escalated To:</strong> {{escalatedTo}}</td></tr>
      <tr><td style="color:#991B1B;font-size:13px"><strong>Source:</strong> {{sourceMeeting}}</td></tr>
    </table>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6">Please resolve this item immediately or provide a documented justification for the delay.</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#991B1B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Resolve Now</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'CRITICAL OVERDUE\n\nDear {{recipientName}},\n\nAction "{{actionTitle}}" is critically overdue ({{daysOverdue}} days past {{dueDate}}).\n\nAssigned To: {{assigneeName}}\nEscalated To: {{escalatedTo}}\nSource: {{sourceMeeting}}\n\nImmediate resolution required.\n\nView: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Recipient display name"},{"name":"actionTitle","description":"Action item title"},{"name":"dueDate","description":"Original due date"},{"name":"daysOverdue","description":"Number of days overdue"},{"name":"assigneeName","description":"Originally assigned person"},{"name":"escalatedTo","description":"Manager or escalation contact"},{"name":"sourceMeeting","description":"Originating meeting or decision"},{"name":"actionUrl","description":"Link to action item"}]',
 'governance', true),

-- ============================================================
-- 12. Change Request Submitted (Planning)
-- ============================================================
(NULL, 'change_request_submitted',
 'Change Request Submitted: {{changeRef}} - {{changeTitle}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#0369A1;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Change Request Submitted</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">A new change request has been submitted and is awaiting review by the Change Advisory Board (CAB).</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#075985;font-size:13px"><strong>Reference:</strong> {{changeRef}}</td></tr>
      <tr><td style="color:#075985;font-size:13px"><strong>Title:</strong> {{changeTitle}}</td></tr>
      <tr><td style="color:#075985;font-size:13px"><strong>Project:</strong> {{projectName}} &nbsp;|&nbsp; <strong>Requested By:</strong> {{requestedBy}}</td></tr>
      <tr><td style="color:#075985;font-size:13px"><strong>Submitted:</strong> {{submittedAt}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Justification:</strong></p>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{justification}}</p>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Impact Assessment:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{impactAssessment}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#0369A1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Review Change Request</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'CHANGE REQUEST SUBMITTED\n\nDear {{recipientName}},\n\nA new change request has been submitted:\n\nRef: {{changeRef}}\nTitle: {{changeTitle}}\nProject: {{projectName}}\nRequested By: {{requestedBy}}\nDate: {{submittedAt}}\n\nJustification:\n{{justification}}\n\nImpact Assessment:\n{{impactAssessment}}\n\nReview: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"CAB reviewer name"},{"name":"changeRef","description":"Change request reference (CHG-YYYY-NNN)"},{"name":"changeTitle","description":"Change request title"},{"name":"projectName","description":"Associated project name"},{"name":"requestedBy","description":"Name of the requester"},{"name":"submittedAt","description":"Submission timestamp"},{"name":"justification","description":"Business justification"},{"name":"impactAssessment","description":"Impact assessment summary"},{"name":"actionUrl","description":"Link to review change request"}]',
 'planning', true),

-- ============================================================
-- 13. Change Request Approved (Planning)
-- ============================================================
(NULL, 'change_request_approved',
 'Approved: Change Request {{changeRef}} has been approved',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#16A34A;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Change Request Approved</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Your change request has been <strong style="color:#16A34A">approved</strong> and is cleared for implementation.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#166534;font-size:13px"><strong>Reference:</strong> {{changeRef}} &mdash; {{changeTitle}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Approved By:</strong> {{approvedBy}} &nbsp;|&nbsp; <strong>Date:</strong> {{approvedAt}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Implementation Window:</strong> {{implementationWindow}}</td></tr>
    </table>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6">Please proceed with the implementation plan and ensure all rollback procedures are documented before execution.</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#16A34A;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Implementation Plan</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'CHANGE REQUEST APPROVED\n\nDear {{recipientName}},\n\nYour change request has been approved.\n\nRef: {{changeRef}} - {{changeTitle}}\nApproved By: {{approvedBy}} on {{approvedAt}}\nImplementation Window: {{implementationWindow}}\n\nPlease proceed with implementation.\n\nView: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Change requester name"},{"name":"changeRef","description":"Change request reference"},{"name":"changeTitle","description":"Change request title"},{"name":"approvedBy","description":"Name of the approver"},{"name":"approvedAt","description":"Approval date"},{"name":"implementationWindow","description":"Scheduled implementation window"},{"name":"actionUrl","description":"Link to implementation plan"}]',
 'planning', true),

-- ============================================================
-- 14. Change Request Rejected (Planning)
-- ============================================================
(NULL, 'change_request_rejected',
 'Rejected: Change Request {{changeRef}} was not approved',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#6B7280;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Change Request Rejected</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Your change request <strong>{{changeRef}}</strong> has been <strong style="color:#EF4444">rejected</strong> by the review board.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#374151;font-size:13px"><strong>Reference:</strong> {{changeRef}} &mdash; {{changeTitle}}</td></tr>
      <tr><td style="color:#374151;font-size:13px"><strong>Reviewed By:</strong> {{reviewedBy}} &nbsp;|&nbsp; <strong>Date:</strong> {{reviewedAt}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Reason for Rejection:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:6px">{{rejectionReason}}</p>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6">You may revise the change request and resubmit it addressing the concerns raised.</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#6B7280;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View &amp; Revise</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'CHANGE REQUEST REJECTED\n\nDear {{recipientName}},\n\nYour change request has been rejected.\n\nRef: {{changeRef}} - {{changeTitle}}\nReviewed By: {{reviewedBy}} on {{reviewedAt}}\n\nReason: {{rejectionReason}}\n\nYou may revise and resubmit.\n\nView: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Change requester name"},{"name":"changeRef","description":"Change request reference"},{"name":"changeTitle","description":"Change request title"},{"name":"reviewedBy","description":"Name of the reviewer"},{"name":"reviewedAt","description":"Review date"},{"name":"rejectionReason","description":"Reason for rejection"},{"name":"actionUrl","description":"Link to revise change request"}]',
 'planning', true),

-- ============================================================
-- 15. Project Status Update (Planning)
-- ============================================================
(NULL, 'project_status_update',
 'Project Update: {{projectName}} status changed to {{newStatus}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1B7340;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Project Status Update</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">The status of project <strong>{{projectName}}</strong> has been updated.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#166534;font-size:13px"><strong>Project:</strong> {{projectName}} ({{projectCode}})</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Previous Status:</strong> {{previousStatus}} &rarr; <strong>New Status:</strong> {{newStatus}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>RAG:</strong> {{ragStatus}} &nbsp;|&nbsp; <strong>Completion:</strong> {{completionPct}}%</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Updated By:</strong> {{updatedBy}} &nbsp;|&nbsp; <strong>Date:</strong> {{updatedAt}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Status Notes:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{statusNotes}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#1B7340;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Project</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'PROJECT STATUS UPDATE\n\nDear {{recipientName}},\n\nProject "{{projectName}}" ({{projectCode}}) status has been updated.\n\nPrevious: {{previousStatus}}\nNew: {{newStatus}}\nRAG: {{ragStatus}}\nCompletion: {{completionPct}}%\nUpdated By: {{updatedBy}} on {{updatedAt}}\n\nNotes: {{statusNotes}}\n\nView: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Stakeholder name"},{"name":"projectName","description":"Project name"},{"name":"projectCode","description":"Project code identifier"},{"name":"previousStatus","description":"Previous project status"},{"name":"newStatus","description":"New project status"},{"name":"ragStatus","description":"RAG status (Green/Amber/Red)"},{"name":"completionPct","description":"Completion percentage"},{"name":"updatedBy","description":"Person who updated status"},{"name":"updatedAt","description":"Update timestamp"},{"name":"statusNotes","description":"Notes accompanying the status change"},{"name":"actionUrl","description":"Link to project dashboard"}]',
 'planning', true),

-- ============================================================
-- 16. Risk Identified (Planning)
-- ============================================================
(NULL, 'risk_identified',
 'New Risk Identified: {{riskTitle}} (Score: {{riskScore}})',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#D97706;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">New Risk Identified</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">A new risk has been logged in the project risk register and assigned to you for mitigation planning.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#92400E;font-size:13px"><strong>Risk:</strong> {{riskTitle}}</td></tr>
      <tr><td style="color:#92400E;font-size:13px"><strong>Project:</strong> {{projectName}}</td></tr>
      <tr><td style="color:#92400E;font-size:13px"><strong>Likelihood:</strong> {{likelihood}} &nbsp;|&nbsp; <strong>Impact:</strong> {{impact}} &nbsp;|&nbsp; <strong>Score:</strong> {{riskScore}}/25</td></tr>
      <tr><td style="color:#92400E;font-size:13px"><strong>Category:</strong> {{riskCategory}} &nbsp;|&nbsp; <strong>Identified By:</strong> {{identifiedBy}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Description:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{description}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Plan Mitigation</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'NEW RISK IDENTIFIED\n\nDear {{recipientName}},\n\nA new risk has been identified:\n\nRisk: {{riskTitle}}\nProject: {{projectName}}\nLikelihood: {{likelihood}} | Impact: {{impact}} | Score: {{riskScore}}/25\nCategory: {{riskCategory}}\nIdentified By: {{identifiedBy}}\n\nDescription:\n{{description}}\n\nPlan mitigation: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Risk owner name"},{"name":"riskTitle","description":"Risk title"},{"name":"projectName","description":"Associated project"},{"name":"likelihood","description":"Likelihood rating (1-5)"},{"name":"impact","description":"Impact rating (1-5)"},{"name":"riskScore","description":"Risk score (likelihood x impact)"},{"name":"riskCategory","description":"Risk category"},{"name":"identifiedBy","description":"Person who identified the risk"},{"name":"description","description":"Risk description"},{"name":"actionUrl","description":"Link to risk register entry"}]',
 'planning', true),

-- ============================================================
-- 17. Password Reset (System)
-- ============================================================
(NULL, 'password_reset',
 'Password Reset Request - ITD-OPMS',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1B7340;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Password Reset</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">We received a request to reset your ITD-OPMS account password. Click the button below to set a new password.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="{{resetUrl}}" style="display:inline-block;background:#1B7340;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
    </div>
    <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6">This link will expire in <strong>{{expiryMinutes}} minutes</strong>. If you did not request a password reset, please ignore this email or contact your IT administrator if you have concerns.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin:0 0 16px">
      <tr><td style="color:#6B7280;font-size:12px"><strong>Request IP:</strong> {{requestIp}} &nbsp;|&nbsp; <strong>Time:</strong> {{requestedAt}}</td></tr>
    </table>
    <p style="margin:0;color:#9CA3AF;font-size:12px">If the button above does not work, copy and paste this URL into your browser:<br><span style="color:#3B82F6;word-break:break-all">{{resetUrl}}</span></p>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'PASSWORD RESET\n\nDear {{recipientName}},\n\nA password reset was requested for your ITD-OPMS account.\n\nReset your password: {{resetUrl}}\n\nThis link expires in {{expiryMinutes}} minutes.\n\nIf you did not request this, please ignore this email.\n\nRequest IP: {{requestIp}}\nTime: {{requestedAt}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"User display name"},{"name":"resetUrl","description":"Password reset URL with token"},{"name":"expiryMinutes","description":"Link expiry in minutes"},{"name":"requestIp","description":"IP address of the request"},{"name":"requestedAt","description":"Request timestamp"}]',
 'system', true),

-- ============================================================
-- 18. Welcome / Onboarding (People)
-- ============================================================
(NULL, 'welcome_onboarding',
 'Welcome to ITD-OPMS, {{recipientName}}!',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1B7340;padding:32px;text-align:center">
    <h1 style="margin:0 0 8px;color:#fff;font-size:24px;font-weight:700">Welcome to ITD-OPMS</h1>
    <p style="margin:0;color:#BBF7D0;font-size:14px">IT Division Operations &amp; Project Management System</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">Your ITD-OPMS account has been created. Below are your login details and next steps to get started.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#166534;font-size:13px"><strong>Email:</strong> {{email}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Role:</strong> {{roleName}} &nbsp;|&nbsp; <strong>Department:</strong> {{department}}</td></tr>
      <tr><td style="color:#166534;font-size:13px"><strong>Office:</strong> {{office}}</td></tr>
    </table>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6"><strong>Getting Started:</strong></p>
    <ol style="margin:0 0 24px;padding:0 0 0 20px;color:#555;font-size:14px;line-height:2">
      <li>Set your password using the link below</li>
      <li>Complete your profile with contact details and skills</li>
      <li>Review your assigned onboarding checklist</li>
      <li>Explore the dashboard and familiarize yourself with the modules</li>
    </ol>
    <div style="text-align:center;margin:24px 0">
      <a href="{{setupUrl}}" style="display:inline-block;background:#1B7340;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Set Up Your Account</a>
    </div>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'WELCOME TO ITD-OPMS\n\nDear {{recipientName}},\n\nYour ITD-OPMS account has been created.\n\nEmail: {{email}}\nRole: {{roleName}}\nDepartment: {{department}}\nOffice: {{office}}\n\nGetting Started:\n1. Set your password: {{setupUrl}}\n2. Complete your profile\n3. Review your onboarding checklist\n4. Explore the dashboard\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"New user display name"},{"name":"email","description":"User email address"},{"name":"roleName","description":"Assigned role name"},{"name":"department","description":"Department name"},{"name":"office","description":"Office assignment"},{"name":"setupUrl","description":"Account setup / password set URL"}]',
 'people', true),

-- ============================================================
-- 19. Knowledge Article Published (Knowledge)
-- ============================================================
(NULL, 'knowledge_article_published',
 'New Knowledge Article: {{articleTitle}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#0E7490;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">New Knowledge Article</h1>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6">A new knowledge article relevant to your role has been published in the ITD-OPMS knowledge base.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background:#ECFEFF;border:1px solid #A5F3FC;border-radius:8px;margin:0 0 24px">
      <tr><td style="color:#155E75;font-size:13px"><strong>Title:</strong> {{articleTitle}}</td></tr>
      <tr><td style="color:#155E75;font-size:13px"><strong>Category:</strong> {{category}} &nbsp;|&nbsp; <strong>Author:</strong> {{authorName}}</td></tr>
      <tr><td style="color:#155E75;font-size:13px"><strong>Published:</strong> {{publishedAt}}</td></tr>
    </table>
    <p style="margin:0 0 8px;color:#333;font-size:15px;line-height:1.6"><strong>Summary:</strong></p>
    <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;padding:12px 16px;background:#f9fafb;border-radius:6px">{{summary}}</p>
    <a href="{{actionUrl}}" style="display:inline-block;background:#0E7490;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Read Article</a>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">This is an automated notification from ITD-OPMS. Please do not reply directly to this email.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'NEW KNOWLEDGE ARTICLE\n\nDear {{recipientName}},\n\nA new article has been published:\n\nTitle: {{articleTitle}}\nCategory: {{category}}\nAuthor: {{authorName}}\nPublished: {{publishedAt}}\n\nSummary:\n{{summary}}\n\nRead: {{actionUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"Subscriber name"},{"name":"articleTitle","description":"Article title"},{"name":"category","description":"Article category"},{"name":"authorName","description":"Author name"},{"name":"publishedAt","description":"Publication date"},{"name":"summary","description":"Article summary excerpt"},{"name":"actionUrl","description":"Link to read full article"}]',
 'knowledge', true),

-- ============================================================
-- 20. Weekly Digest (System)
-- ============================================================
(NULL, 'weekly_digest',
 'Your Weekly ITD-OPMS Summary - Week of {{weekStart}}',
 E'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:''Segoe UI'',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
  <tr><td style="background:#1B7340;padding:24px 32px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Weekly Summary</h1>
    <p style="margin:4px 0 0;color:#BBF7D0;font-size:13px">Week of {{weekStart}} &mdash; {{weekEnd}}</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 20px;color:#1a1a1a;font-size:15px;line-height:1.6">Dear {{recipientName}},</p>
    <p style="margin:0 0 24px;color:#333;font-size:15px;line-height:1.6">Here is your weekly activity summary from ITD-OPMS.</p>

    <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:16px;font-weight:600;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Tickets</h2>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="color:#555;font-size:13px">New tickets</td><td style="color:#1a1a1a;font-size:13px;font-weight:600;text-align:right">{{newTickets}}</td></tr>
      <tr style="background:#f9fafb"><td style="color:#555;font-size:13px">Resolved</td><td style="color:#22C55E;font-size:13px;font-weight:600;text-align:right">{{resolvedTickets}}</td></tr>
      <tr><td style="color:#555;font-size:13px">SLA Breaches</td><td style="color:#EF4444;font-size:13px;font-weight:600;text-align:right">{{slaBreaches}}</td></tr>
    </table>

    <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:16px;font-weight:600;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Projects</h2>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="color:#555;font-size:13px">Active projects</td><td style="color:#1a1a1a;font-size:13px;font-weight:600;text-align:right">{{activeProjects}}</td></tr>
      <tr style="background:#f9fafb"><td style="color:#555;font-size:13px">Milestones completed</td><td style="color:#22C55E;font-size:13px;font-weight:600;text-align:right">{{milestonesCompleted}}</td></tr>
      <tr><td style="color:#555;font-size:13px">Risks (Red)</td><td style="color:#EF4444;font-size:13px;font-weight:600;text-align:right">{{redRisks}}</td></tr>
    </table>

    <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:16px;font-weight:600;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Your Items</h2>
    <table width="100%" cellpadding="8" cellspacing="0" style="margin:0 0 24px">
      <tr><td style="color:#555;font-size:13px">Assigned to you</td><td style="color:#1a1a1a;font-size:13px;font-weight:600;text-align:right">{{assignedToYou}}</td></tr>
      <tr style="background:#f9fafb"><td style="color:#555;font-size:13px">Pending approvals</td><td style="color:#F59E0B;font-size:13px;font-weight:600;text-align:right">{{pendingApprovals}}</td></tr>
      <tr><td style="color:#555;font-size:13px">Overdue items</td><td style="color:#EF4444;font-size:13px;font-weight:600;text-align:right">{{overdueItems}}</td></tr>
    </table>

    <div style="text-align:center;margin:24px 0">
      <a href="{{dashboardUrl}}" style="display:inline-block;background:#1B7340;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open Dashboard</a>
    </div>
  </td></tr>
  <tr><td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#6b7280;font-size:12px">You receive this digest weekly. To change frequency or unsubscribe, visit your <a href="{{preferencesUrl}}" style="color:#3B82F6;text-decoration:none">notification preferences</a>.</p>
  </td></tr>
</table>
</td></tr></table></body></html>',
 E'ITD-OPMS WEEKLY SUMMARY\nWeek of {{weekStart}} - {{weekEnd}}\n\nDear {{recipientName}},\n\nTICKETS\n- New: {{newTickets}}\n- Resolved: {{resolvedTickets}}\n- SLA Breaches: {{slaBreaches}}\n\nPROJECTS\n- Active: {{activeProjects}}\n- Milestones completed: {{milestonesCompleted}}\n- Red risks: {{redRisks}}\n\nYOUR ITEMS\n- Assigned: {{assignedToYou}}\n- Pending approvals: {{pendingApprovals}}\n- Overdue: {{overdueItems}}\n\nDashboard: {{dashboardUrl}}\nPreferences: {{preferencesUrl}}\n\n---\nITD-OPMS Automated Notification',
 '[{"name":"recipientName","description":"User display name"},{"name":"weekStart","description":"Week start date"},{"name":"weekEnd","description":"Week end date"},{"name":"newTickets","description":"Count of new tickets this week"},{"name":"resolvedTickets","description":"Count of resolved tickets"},{"name":"slaBreaches","description":"Count of SLA breaches"},{"name":"activeProjects","description":"Count of active projects"},{"name":"milestonesCompleted","description":"Milestones completed this week"},{"name":"redRisks","description":"Count of red-rated risks"},{"name":"assignedToYou","description":"Items assigned to user"},{"name":"pendingApprovals","description":"Pending approval count"},{"name":"overdueItems","description":"Overdue item count"},{"name":"dashboardUrl","description":"Link to dashboard"},{"name":"preferencesUrl","description":"Link to notification preferences"}]',
 'system', true);

-- +goose Down
DELETE FROM email_templates WHERE name IN (
  'sla_breach_warning',
  'sla_breach_notification',
  'approval_request',
  'assignment_notification',
  'escalation_notification',
  'major_incident',
  'license_renewal_reminder',
  'audit_evidence_request',
  'action_due_reminder',
  'action_overdue_reminder',
  'action_critical_overdue',
  'change_request_submitted',
  'change_request_approved',
  'change_request_rejected',
  'project_status_update',
  'risk_identified',
  'password_reset',
  'welcome_onboarding',
  'knowledge_article_published',
  'weekly_digest'
);

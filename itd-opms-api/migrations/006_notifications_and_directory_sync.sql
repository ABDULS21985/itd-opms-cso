-- +goose Up
-- Migration 006: Notification System & Directory Sync
-- Supports: email, Teams, in-app notifications with outbox pattern,
-- user preferences, notification templates, dead-letter queue,
-- Teams channel mappings, and directory sync tracking.

-- ──────────────────────────────────────────────
-- Directory Sync Runs (tracking Entra ID delta syncs)
-- ──────────────────────────────────────────────
CREATE TABLE directory_sync_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    delta_token         TEXT,
    users_created       INT NOT NULL DEFAULT 0,
    users_updated       INT NOT NULL DEFAULT 0,
    users_deactivated   INT NOT NULL DEFAULT 0,
    errors              JSONB NOT NULL DEFAULT '[]',
    status              TEXT NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_directory_sync_runs_status ON directory_sync_runs(status, started_at DESC);

-- ──────────────────────────────────────────────
-- Notification Templates (version-controlled, configurable)
-- ──────────────────────────────────────────────
CREATE TABLE notification_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    channel         TEXT NOT NULL CHECK (channel IN ('email', 'teams', 'in_app')),
    subject_template TEXT,
    body_template   TEXT NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_key ON notification_templates(key) WHERE is_active = true;

CREATE TRIGGER trg_notification_templates_updated
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Notification Outbox (transactional outbox pattern)
-- ──────────────────────────────────────────────
CREATE TABLE notification_outbox (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    channel             TEXT NOT NULL CHECK (channel IN ('email', 'teams', 'in_app')),
    recipient_id        UUID REFERENCES users(id),
    recipient_email     TEXT,
    template_key        TEXT NOT NULL,
    template_data       JSONB NOT NULL DEFAULT '{}',
    subject             TEXT,
    rendered_body       TEXT,
    priority            INT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dlq')),
    attempts            INT NOT NULL DEFAULT 0,
    last_attempt_at     TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    error_message       TEXT,
    correlation_id      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_pending ON notification_outbox(status, priority DESC, created_at ASC)
    WHERE status = 'pending';
CREATE INDEX idx_outbox_processing ON notification_outbox(status, last_attempt_at)
    WHERE status = 'processing';
CREATE INDEX idx_outbox_failed ON notification_outbox(status, attempts)
    WHERE status = 'failed';
CREATE INDEX idx_outbox_recipient ON notification_outbox(recipient_id, created_at DESC);
CREATE INDEX idx_outbox_tenant ON notification_outbox(tenant_id, created_at DESC);

-- ──────────────────────────────────────────────
-- Notification Dead Letter Queue
-- ──────────────────────────────────────────────
CREATE TABLE notification_dlq (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id       UUID NOT NULL REFERENCES notification_outbox(id) ON DELETE CASCADE,
    error_details   JSONB NOT NULL DEFAULT '{}',
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_dlq_outbox ON notification_dlq(outbox_id);
CREATE INDEX idx_notification_dlq_moved ON notification_dlq(moved_at DESC);

-- ──────────────────────────────────────────────
-- In-App Notifications (user-facing, stored)
-- ──────────────────────────────────────────────
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    action_url      TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    read_at         TIMESTAMPTZ,
    outbox_id       UUID REFERENCES notification_outbox(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at DESC);

-- ──────────────────────────────────────────────
-- User Notification Preferences
-- ──────────────────────────────────────────────
CREATE TABLE user_notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    channel_preferences JSONB NOT NULL DEFAULT '{"email": true, "teams": true, "in_app": true}',
    digest_frequency    TEXT NOT NULL DEFAULT 'immediate'
                        CHECK (digest_frequency IN ('immediate', 'daily', 'weekly')),
    quiet_hours_start   TIME,
    quiet_hours_end     TIME,
    disabled_types      TEXT[] NOT NULL DEFAULT '{}',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_notification_prefs_user ON user_notification_preferences(user_id);

CREATE TRIGGER trg_user_notification_prefs_updated
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Teams Channel Mappings
-- ──────────────────────────────────────────────
CREATE TABLE teams_channel_mappings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    team_id             TEXT NOT NULL,
    channel_id          TEXT NOT NULL,
    channel_name        TEXT,
    notification_types  TEXT[] NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    configured_by       UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_channel_mappings_tenant ON teams_channel_mappings(tenant_id) WHERE is_active = true;

-- ──────────────────────────────────────────────
-- Seed: Default notification templates
-- ──────────────────────────────────────────────
INSERT INTO notification_templates (key, name, channel, subject_template, body_template) VALUES
('sla_breach_warning', 'SLA Breach Warning', 'email',
 'SLA Warning: {{.TicketRef}} approaching breach',
 '<h2>SLA Breach Warning</h2><p>Ticket <strong>{{.TicketRef}}</strong> is approaching its SLA deadline.</p><p><strong>Priority:</strong> {{.Priority}}<br/><strong>Target:</strong> {{.TargetTime}}<br/><strong>Remaining:</strong> {{.TimeRemaining}}</p><p><a href="{{.ActionURL}}">View Ticket</a></p>'),

('sla_breach_notification', 'SLA Breach Notification', 'email',
 'SLA BREACHED: {{.TicketRef}}',
 '<h2 style="color:#dc2626">SLA Breached</h2><p>Ticket <strong>{{.TicketRef}}</strong> has breached its SLA.</p><p><strong>Priority:</strong> {{.Priority}}<br/><strong>Breached At:</strong> {{.BreachedAt}}</p><p><a href="{{.ActionURL}}">Take Action</a></p>'),

('approval_request', 'Approval Request', 'email',
 'Approval Required: {{.EntityType}} — {{.EntityTitle}}',
 '<h2>Approval Required</h2><p>{{.RequesterName}} has requested your approval for:</p><p><strong>{{.EntityType}}:</strong> {{.EntityTitle}}</p><p>{{.Description}}</p><p><a href="{{.ApproveURL}}">Approve</a> | <a href="{{.RejectURL}}">Reject</a> | <a href="{{.ActionURL}}">View Details</a></p>'),

('assignment_notification', 'Assignment Notification', 'email',
 'New Assignment: {{.EntityType}} — {{.EntityTitle}}',
 '<h2>New Assignment</h2><p>You have been assigned to:</p><p><strong>{{.EntityType}}:</strong> {{.EntityTitle}}<br/><strong>Priority:</strong> {{.Priority}}<br/><strong>Assigned By:</strong> {{.AssignerName}}</p><p><a href="{{.ActionURL}}">View Details</a></p>'),

('escalation_notification', 'Escalation Notification', 'email',
 'Escalation: {{.TicketRef}} — {{.EscalationLevel}}',
 '<h2>Ticket Escalated</h2><p>Ticket <strong>{{.TicketRef}}</strong> has been escalated to {{.EscalationLevel}}.</p><p><strong>Reason:</strong> {{.Reason}}<br/><strong>Previous Owner:</strong> {{.PreviousOwner}}</p><p><a href="{{.ActionURL}}">View Ticket</a></p>'),

('license_renewal_reminder', 'License/Warranty Renewal Reminder', 'email',
 'Renewal Reminder: {{.AssetName}} — {{.RenewalType}} expiring {{.ExpiryDate}}',
 '<h2>Renewal Reminder</h2><p>The {{.RenewalType}} for <strong>{{.AssetName}}</strong> is expiring soon.</p><p><strong>Expiry Date:</strong> {{.ExpiryDate}}<br/><strong>Vendor:</strong> {{.Vendor}}<br/><strong>Cost:</strong> {{.EstimatedCost}}</p><p><a href="{{.ActionURL}}">Manage Renewal</a></p>'),

('audit_evidence_request', 'Audit Evidence Collection Request', 'email',
 'Evidence Required: {{.AuditTitle}} — {{.EvidenceType}}',
 '<h2>Evidence Collection Request</h2><p>Evidence is required for audit <strong>{{.AuditTitle}}</strong>.</p><p><strong>Evidence Type:</strong> {{.EvidenceType}}<br/><strong>Due Date:</strong> {{.DueDate}}<br/><strong>Requested By:</strong> {{.RequesterName}}</p><p><a href="{{.ActionURL}}">Upload Evidence</a></p>'),

('major_incident', 'Major Incident Communication', 'email',
 '[P{{.Priority}}] Major Incident: {{.IncidentTitle}}',
 '<h2 style="color:#dc2626">Major Incident</h2><p><strong>Incident:</strong> {{.IncidentTitle}}<br/><strong>Priority:</strong> P{{.Priority}}<br/><strong>Status:</strong> {{.Status}}<br/><strong>Impact:</strong> {{.Impact}}</p><p>{{.Description}}</p><p><a href="{{.ActionURL}}">Incident Details</a></p>'),

-- Teams Adaptive Card templates (stored as JSON)
('teams_approval_card', 'Teams Approval Card', 'teams', NULL,
 '{"type":"AdaptiveCard","$schema":"http://adaptivecards.io/schemas/adaptive-card.json","version":"1.4","body":[{"type":"Container","style":"emphasis","items":[{"type":"TextBlock","text":"Approval Required","weight":"bolder","size":"medium"}]},{"type":"TextBlock","text":"{{.RequesterName}} requests approval for:","wrap":true},{"type":"FactSet","facts":[{"title":"Type","value":"{{.EntityType}}"},{"title":"Title","value":"{{.EntityTitle}}"},{"title":"Priority","value":"{{.Priority}}"}]},{"type":"TextBlock","text":"{{.Description}}","wrap":true}],"actions":[{"type":"Action.OpenUrl","title":"Approve","url":"{{.ApproveURL}}","style":"positive"},{"type":"Action.OpenUrl","title":"Reject","url":"{{.RejectURL}}","style":"destructive"},{"type":"Action.OpenUrl","title":"View Details","url":"{{.ActionURL}}"}]}'),

('teams_sla_breach_card', 'Teams SLA Breach Card', 'teams', NULL,
 '{"type":"AdaptiveCard","$schema":"http://adaptivecards.io/schemas/adaptive-card.json","version":"1.4","body":[{"type":"Container","style":"attention","items":[{"type":"TextBlock","text":"SLA Breached","weight":"bolder","size":"medium","color":"attention"}]},{"type":"FactSet","facts":[{"title":"Ticket","value":"{{.TicketRef}}"},{"title":"Priority","value":"{{.Priority}}"},{"title":"Breached At","value":"{{.BreachedAt}}"}]}],"actions":[{"type":"Action.OpenUrl","title":"View Ticket","url":"{{.ActionURL}}"}]}'),

('teams_major_incident_card', 'Teams Major Incident Card', 'teams', NULL,
 '{"type":"AdaptiveCard","$schema":"http://adaptivecards.io/schemas/adaptive-card.json","version":"1.4","body":[{"type":"Container","style":"attention","items":[{"type":"TextBlock","text":"Major Incident — P{{.Priority}}","weight":"bolder","size":"medium","color":"attention"}]},{"type":"TextBlock","text":"{{.IncidentTitle}}","weight":"bolder","wrap":true},{"type":"FactSet","facts":[{"title":"Status","value":"{{.Status}}"},{"title":"Impact","value":"{{.Impact}}"},{"title":"Assigned To","value":"{{.AssignedTo}}"}]},{"type":"TextBlock","text":"{{.Description}}","wrap":true}],"actions":[{"type":"Action.OpenUrl","title":"View Incident","url":"{{.ActionURL}}"}]}');

-- +goose Down
DROP TABLE IF EXISTS teams_channel_mappings;
DROP TABLE IF EXISTS user_notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notification_dlq;
DROP TABLE IF EXISTS notification_outbox;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS directory_sync_runs;

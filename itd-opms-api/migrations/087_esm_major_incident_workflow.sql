-- +goose Up
-- Migration 087: ESM major incident workflow, comms templates, and PIR scaffolding.

CREATE TABLE major_incident_records (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                 UUID NOT NULL REFERENCES tenants(id),
    ticket_id                 UUID NOT NULL REFERENCES tickets(id) UNIQUE,
    severity                  TEXT NOT NULL DEFAULT 'sev1'
                              CHECK (severity IN ('sev1', 'sev2', 'sev3')),
    incident_commander_id     UUID REFERENCES users(id),
    communication_lead_id     UUID REFERENCES users(id),
    bridge_url                TEXT,
    bridge_phone              TEXT,
    affected_services         TEXT[] NOT NULL DEFAULT '{}',
    affected_ci_ids           UUID[] NOT NULL DEFAULT '{}',
    estimated_affected_users  INT NOT NULL DEFAULT 0,
    business_impact           TEXT
                              CHECK (business_impact IN ('critical', 'high', 'medium', 'low')),
    status                    TEXT NOT NULL DEFAULT 'declared'
                              CHECK (status IN (
                                  'declared', 'investigating', 'mitigating', 'mitigated',
                                  'monitoring', 'resolved', 'pir_pending', 'closed'
                              )),
    stakeholder_updates       JSONB NOT NULL DEFAULT '[]',
    resolution_summary        TEXT,
    root_cause_summary        TEXT,
    pir_scheduled_date        TIMESTAMPTZ,
    pir_completed_date        TIMESTAMPTZ,
    pir_report                JSONB,
    communication_plan        JSONB NOT NULL DEFAULT '{}',
    declared_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at               TIMESTAMPTZ,
    closed_at                 TIMESTAMPTZ,
    total_duration_minutes    INT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_major_incidents_tenant ON major_incident_records(tenant_id);
CREATE INDEX idx_major_incidents_status ON major_incident_records(tenant_id, status);
CREATE INDEX idx_major_incidents_ticket ON major_incident_records(ticket_id);

CREATE TRIGGER trg_major_incident_records_updated
    BEFORE UPDATE ON major_incident_records
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

INSERT INTO notification_templates (key, name, channel, subject_template, body_template)
VALUES
(
    'major-incident-declared',
    'Major Incident Declared',
    'email',
    '{{.severityLabel}} Major Incident Declared: {{.ticketNumber}}',
    '<h2 style="color:#b91c1c;margin-bottom:12px">{{.severityLabel}} major incident declared</h2><p><strong>{{.ticketNumber}}</strong> — {{.ticketTitle}}</p><p><strong>Status:</strong> {{.currentStatus}}<br/><strong>Business impact:</strong> {{.businessImpact}}<br/><strong>Bridge:</strong> {{.bridgeUrl}} {{.bridgePhone}}</p><p>{{.summary}}</p><p><a href="{{.actionUrl}}">Open incident workspace</a></p>'
),
(
    'major-incident-update',
    'Major Incident Update',
    'email',
    '{{.severityLabel}} Update: {{.ticketNumber}}',
    '<h2 style="color:#b45309;margin-bottom:12px">Major incident update</h2><p><strong>{{.ticketNumber}}</strong> — {{.ticketTitle}}</p><p><strong>Status:</strong> {{.currentStatus}}</p><p>{{.message}}</p><p><strong>Bridge:</strong> {{.bridgeUrl}} {{.bridgePhone}}</p><p><a href="{{.actionUrl}}">Open incident workspace</a></p>'
),
(
    'major-incident-resolved',
    'Major Incident Resolved',
    'email',
    '{{.severityLabel}} Resolved: {{.ticketNumber}}',
    '<h2 style="color:#166534;margin-bottom:12px">Major incident resolved</h2><p><strong>{{.ticketNumber}}</strong> — {{.ticketTitle}}</p><p><strong>Resolution summary:</strong> {{.resolutionSummary}}</p><p><strong>Root cause:</strong> {{.rootCauseSummary}}</p><p><strong>PIR scheduled:</strong> {{.pirScheduledDate}}</p><p><a href="{{.actionUrl}}">Review major incident</a></p>'
),
(
    'major-incident-pir-reminder',
    'Major Incident PIR Reminder',
    'email',
    'PIR reminder: {{.ticketNumber}} due {{.pirScheduledDate}}',
    '<h2 style="color:#1d4ed8;margin-bottom:12px">Post-incident review scheduled</h2><p><strong>{{.ticketNumber}}</strong> — {{.ticketTitle}}</p><p>The PIR is due on <strong>{{.pirScheduledDate}}</strong>.</p><p>{{.message}}</p><p><a href="{{.actionUrl}}">Open PIR workspace</a></p>'
),
(
    'teams_major_incident_workflow_card',
    'Teams Major Incident Workflow Card',
    'teams',
    NULL,
    '{"type":"AdaptiveCard","$schema":"http://adaptivecards.io/schemas/adaptive-card.json","version":"1.4","body":[{"type":"Container","style":"attention","items":[{"type":"TextBlock","text":"{{.cardTitle}}","weight":"Bolder","size":"Large","wrap":true},{"type":"TextBlock","text":"{{.severityLabel}} • {{.ticketNumber}}","spacing":"Small","wrap":true}]},{"type":"TextBlock","text":"{{.ticketTitle}}","weight":"Bolder","wrap":true},{"type":"FactSet","facts":[{"title":"Status","value":"{{.currentStatus}}"},{"title":"Impact","value":"{{.businessImpact}}"},{"title":"Commander","value":"{{.incidentCommander}}"},{"title":"Bridge","value":"{{.bridgePhone}}"}]},{"type":"TextBlock","text":"{{.summary}}","wrap":true},{"type":"TextBlock","text":"Bridge: {{.bridgeUrl}}","wrap":true,"isSubtle":true}],"actions":[{"type":"Action.OpenUrl","title":"Open workspace","url":"{{.actionUrl}}"}]}'
)
ON CONFLICT (key) DO UPDATE
SET
    name = EXCLUDED.name,
    channel = EXCLUDED.channel,
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    is_active = true,
    updated_at = now();

UPDATE teams_channel_mappings
SET notification_types = CASE
    WHEN 'teams_major_incident_workflow_card' = ANY(notification_types) THEN notification_types
    ELSE array_append(notification_types, 'teams_major_incident_workflow_card')
END
WHERE is_active = true;

-- +goose Down
UPDATE teams_channel_mappings
SET notification_types = array_remove(notification_types, 'teams_major_incident_workflow_card')
WHERE is_active = true;

DELETE FROM notification_templates
WHERE key IN (
    'teams_major_incident_workflow_card',
    'major-incident-pir-reminder',
    'major-incident-resolved',
    'major-incident-update',
    'major-incident-declared'
);

DROP TABLE IF EXISTS major_incident_records;

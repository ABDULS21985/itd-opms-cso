-- +goose Up
-- Migration 009: ITSM Module
-- Supports: Service catalog, Tickets (incident/service_request/change), SLA management,
-- Escalation rules, Problem management, Known errors, Support queues, CSAT surveys.

-- ──────────────────────────────────────────────
-- Sequences for auto-numbered identifiers
-- ──────────────────────────────────────────────
CREATE SEQUENCE ticket_seq START 1;
CREATE SEQUENCE problem_seq START 1;

-- ──────────────────────────────────────────────
-- Business Hours Calendars (must precede SLA policies)
-- ──────────────────────────────────────────────
CREATE TABLE business_hours_calendars (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    name       TEXT NOT NULL,
    timezone   TEXT NOT NULL DEFAULT 'Africa/Lagos',
    schedule   JSONB NOT NULL,
    holidays   JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_business_hours_calendars_updated
    BEFORE UPDATE ON business_hours_calendars
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- SLA Policies
-- ──────────────────────────────────────────────
CREATE TABLE sla_policies (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                  UUID NOT NULL REFERENCES tenants(id),
    name                       TEXT NOT NULL,
    description                TEXT,
    priority_targets           JSONB NOT NULL,
    business_hours_calendar_id UUID REFERENCES business_hours_calendars(id),
    is_default                 BOOLEAN DEFAULT false,
    is_active                  BOOLEAN DEFAULT true,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sla_policies_updated
    BEFORE UPDATE ON sla_policies
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Service Catalog Categories
-- ──────────────────────────────────────────────
CREATE TABLE service_catalog_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id),
    name       TEXT NOT NULL,
    description TEXT,
    icon       TEXT,
    parent_id  UUID REFERENCES service_catalog_categories(id),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_catalog_categories_tenant_parent ON service_catalog_categories(tenant_id, parent_id);

CREATE TRIGGER trg_service_catalog_categories_updated
    BEFORE UPDATE ON service_catalog_categories
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Service Catalog Items
-- ──────────────────────────────────────────────
CREATE TABLE service_catalog_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    category_id             UUID REFERENCES service_catalog_categories(id),
    name                    TEXT NOT NULL,
    description             TEXT,
    fulfillment_workflow_id UUID,
    approval_required       BOOLEAN DEFAULT false,
    approval_chain_config   JSONB,
    sla_policy_id           UUID REFERENCES sla_policies(id),
    form_schema             JSONB,
    entitlement_roles       TEXT[] DEFAULT '{}',
    estimated_delivery      TEXT,
    status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated')),
    version                 INT DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_catalog_items_tenant_category ON service_catalog_items(tenant_id, category_id);
CREATE INDEX idx_service_catalog_items_tenant_status ON service_catalog_items(tenant_id, status);

CREATE TRIGGER trg_service_catalog_items_updated
    BEFORE UPDATE ON service_catalog_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- Support Queues
-- ──────────────────────────────────────────────
CREATE TABLE support_queues (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    name             TEXT NOT NULL,
    team_id          UUID,
    priority_filter  TEXT[] DEFAULT '{}',
    auto_assign_rule TEXT NOT NULL DEFAULT 'manual' CHECK (auto_assign_rule IN ('round_robin','least_loaded','skills_based','manual')),
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_queues_tenant_active ON support_queues(tenant_id, is_active);

-- ──────────────────────────────────────────────
-- Tickets
-- ──────────────────────────────────────────────
CREATE TABLE tickets (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id),
    ticket_number               TEXT NOT NULL UNIQUE,
    type                        TEXT NOT NULL CHECK (type IN ('incident','service_request','problem','change')),
    category                    TEXT,
    subcategory                 TEXT,
    title                       TEXT NOT NULL,
    description                 TEXT NOT NULL,
    priority                    TEXT NOT NULL DEFAULT 'P3_medium' CHECK (priority IN ('P1_critical','P2_high','P3_medium','P4_low')),
    urgency                     TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('critical','high','medium','low')),
    impact                      TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('critical','high','medium','low')),
    status                      TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('logged','classified','assigned','in_progress','pending_customer','pending_vendor','resolved','closed','cancelled')),
    channel                     TEXT NOT NULL DEFAULT 'portal' CHECK (channel IN ('portal','email','manual','api')),
    reporter_id                 UUID NOT NULL,
    assignee_id                 UUID,
    team_queue_id               UUID REFERENCES support_queues(id),
    sla_policy_id               UUID REFERENCES sla_policies(id),
    sla_response_target         TIMESTAMPTZ,
    sla_resolution_target       TIMESTAMPTZ,
    sla_response_met            BOOLEAN,
    sla_resolution_met          BOOLEAN,
    sla_paused_at               TIMESTAMPTZ,
    sla_paused_duration_minutes INT DEFAULT 0,
    is_major_incident           BOOLEAN DEFAULT false,
    related_ticket_ids          UUID[] DEFAULT '{}',
    linked_problem_id           UUID,
    linked_asset_ids            UUID[] DEFAULT '{}',
    resolution_notes            TEXT,
    resolved_at                 TIMESTAMPTZ,
    closed_at                   TIMESTAMPTZ,
    first_response_at           TIMESTAMPTZ,
    satisfaction_score          INT,
    tags                        TEXT[] DEFAULT '{}',
    custom_fields               JSONB,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_tenant_status ON tickets(tenant_id, status);
CREATE INDEX idx_tickets_tenant_assignee ON tickets(tenant_id, assignee_id);
CREATE INDEX idx_tickets_tenant_priority_status ON tickets(tenant_id, priority, status);
CREATE INDEX idx_tickets_tenant_reporter ON tickets(tenant_id, reporter_id);
CREATE INDEX idx_tickets_tenant_queue ON tickets(tenant_id, team_queue_id);
CREATE INDEX idx_tickets_tenant_type ON tickets(tenant_id, type);
CREATE INDEX idx_tickets_tenant_created ON tickets(tenant_id, created_at DESC);

CREATE TRIGGER trg_tickets_updated
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- Auto-generate ticket_number based on type
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        CASE NEW.type
            WHEN 'incident' THEN
                NEW.ticket_number := 'INC-' || LPAD(nextval('ticket_seq')::text, 6, '0');
            WHEN 'service_request' THEN
                NEW.ticket_number := 'SR-' || LPAD(nextval('ticket_seq')::text, 6, '0');
            WHEN 'change' THEN
                NEW.ticket_number := 'CHG-' || LPAD(nextval('ticket_seq')::text, 6, '0');
            ELSE
                NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_seq')::text, 6, '0');
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION fn_generate_ticket_number();

-- ──────────────────────────────────────────────
-- Ticket Comments
-- ──────────────────────────────────────────────
CREATE TABLE ticket_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments UUID[] DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_comments_ticket_created ON ticket_comments(ticket_id, created_at);

-- ──────────────────────────────────────────────
-- Ticket Status History
-- ──────────────────────────────────────────────
CREATE TABLE ticket_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status   TEXT NOT NULL,
    changed_by  UUID NOT NULL,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_status_history_ticket_created ON ticket_status_history(ticket_id, created_at);

-- ──────────────────────────────────────────────
-- Escalation Rules
-- ──────────────────────────────────────────────
CREATE TABLE escalation_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    name             TEXT NOT NULL,
    trigger_type     TEXT NOT NULL CHECK (trigger_type IN ('sla_warning','sla_breach','priority','manual')),
    trigger_config   JSONB,
    escalation_chain JSONB,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_escalation_rules_updated
    BEFORE UPDATE ON escalation_rules
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- SLA Breach Log
-- ──────────────────────────────────────────────
CREATE TABLE sla_breach_log (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id              UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    breach_type            TEXT NOT NULL CHECK (breach_type IN ('response','resolution')),
    breached_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    target_was             TIMESTAMPTZ NOT NULL,
    actual_duration_minutes INT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_breach_log_ticket ON sla_breach_log(ticket_id);
CREATE INDEX idx_sla_breach_log_breached_at ON sla_breach_log(breached_at);

-- ──────────────────────────────────────────────
-- Problems
-- ──────────────────────────────────────────────
CREATE TABLE problems (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    problem_number      TEXT NOT NULL UNIQUE,
    title               TEXT NOT NULL,
    description         TEXT,
    root_cause          TEXT,
    status              TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('logged','investigating','root_cause_identified','known_error','resolved')),
    linked_incident_ids UUID[] DEFAULT '{}',
    workaround          TEXT,
    permanent_fix       TEXT,
    linked_change_id    UUID,
    owner_id            UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_problems_tenant_status ON problems(tenant_id, status);

CREATE TRIGGER trg_problems_updated
    BEFORE UPDATE ON problems
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- Auto-generate problem_number
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_generate_problem_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.problem_number IS NULL OR NEW.problem_number = '' THEN
        NEW.problem_number := 'PRB-' || LPAD(nextval('problem_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_problem_number
    BEFORE INSERT ON problems
    FOR EACH ROW
    EXECUTE FUNCTION fn_generate_problem_number();

-- ──────────────────────────────────────────────
-- Known Errors
-- ──────────────────────────────────────────────
CREATE TABLE known_errors (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id    UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    workaround    TEXT,
    kb_article_id UUID,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','retired')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────
-- CSAT Surveys
-- ──────────────────────────────────────────────
CREATE TABLE csat_surveys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    respondent_id UUID NOT NULL,
    rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_csat_surveys_ticket ON csat_surveys(ticket_id);

-- +goose Down
DROP TABLE IF EXISTS csat_surveys;
DROP TABLE IF EXISTS known_errors;
DROP TRIGGER IF EXISTS trg_problem_number ON problems;
DROP FUNCTION IF EXISTS fn_generate_problem_number();
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS sla_breach_log;
DROP TABLE IF EXISTS escalation_rules;
DROP TABLE IF EXISTS ticket_status_history;
DROP TABLE IF EXISTS ticket_comments;
DROP TRIGGER IF EXISTS trg_ticket_number ON tickets;
DROP FUNCTION IF EXISTS fn_generate_ticket_number();
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS support_queues;
DROP TABLE IF EXISTS service_catalog_items;
DROP TABLE IF EXISTS service_catalog_categories;
DROP TABLE IF EXISTS sla_policies;
DROP TABLE IF EXISTS business_hours_calendars;
DROP SEQUENCE IF EXISTS problem_seq;
DROP SEQUENCE IF EXISTS ticket_seq;

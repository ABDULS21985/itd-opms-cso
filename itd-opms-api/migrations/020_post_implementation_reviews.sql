-- +goose Up
-- FR-C016: Post-Implementation Reviews (PIR) with structured templates.

CREATE TABLE post_implementation_reviews (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    project_id               UUID NOT NULL REFERENCES projects(id),
    title                    TEXT NOT NULL,
    status                   TEXT NOT NULL DEFAULT 'draft',
    review_type              TEXT NOT NULL DEFAULT 'project',
    scheduled_date           DATE,
    completed_date           DATE,
    facilitator_id           UUID REFERENCES users(id),

    -- Structured review sections
    objectives_met           TEXT,
    scope_adherence          TEXT,
    timeline_adherence       TEXT,
    budget_adherence         TEXT,
    quality_assessment       TEXT,
    stakeholder_satisfaction TEXT,

    -- Dynamic sections (JSON arrays)
    successes                JSONB DEFAULT '[]',
    challenges               JSONB DEFAULT '[]',
    lessons_learned          JSONB DEFAULT '[]',
    recommendations          JSONB DEFAULT '[]',

    -- Score (1-5)
    overall_score            INT CHECK (overall_score IS NULL OR (overall_score BETWEEN 1 AND 5)),

    -- Participants
    participants             UUID[] DEFAULT '{}',

    created_by               UUID NOT NULL REFERENCES users(id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pir_tenant ON post_implementation_reviews(tenant_id);
CREATE INDEX idx_pir_project ON post_implementation_reviews(project_id);
CREATE INDEX idx_pir_status ON post_implementation_reviews(tenant_id, status);

CREATE TRIGGER trg_pir_updated
    BEFORE UPDATE ON post_implementation_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- PIR templates for reusable review structures.
CREATE TABLE pir_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    name        TEXT NOT NULL,
    description TEXT,
    review_type TEXT NOT NULL DEFAULT 'project',
    sections    JSONB NOT NULL DEFAULT '[]',
    is_default  BOOLEAN DEFAULT false,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pir_templates_tenant ON pir_templates(tenant_id);

CREATE TRIGGER trg_pir_templates_updated
    BEFORE UPDATE ON pir_templates
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Seed a default PIR template.
INSERT INTO pir_templates (id, tenant_id, name, description, review_type, sections, is_default, created_by) VALUES
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Standard Project PIR',
 'Default template for project post-implementation reviews', 'project',
 '[
   {"key": "objectives_met", "label": "Objectives Achievement", "description": "Were the stated project objectives fully achieved?", "required": true},
   {"key": "scope_adherence", "label": "Scope Management", "description": "Was project scope managed effectively? Any scope creep?", "required": true},
   {"key": "timeline_adherence", "label": "Timeline Performance", "description": "Was the project delivered on schedule?", "required": true},
   {"key": "budget_adherence", "label": "Budget Performance", "description": "Was the project delivered within budget?", "required": true},
   {"key": "quality_assessment", "label": "Quality Assessment", "description": "Assess the quality of deliverables against acceptance criteria.", "required": true},
   {"key": "stakeholder_satisfaction", "label": "Stakeholder Satisfaction", "description": "Summary of stakeholder feedback and satisfaction levels.", "required": false}
 ]'::jsonb,
 true, '20000000-0000-0000-0000-000000000001');

-- +goose Down
DROP TABLE IF EXISTS pir_templates;
DROP TABLE IF EXISTS post_implementation_reviews;

-- +goose Up
-- Migration 041: Add tenant_id to child tables for Row-Level Security (RLS)
-- Backfills tenant_id from each child's parent table so every tenant-scoped
-- table has a direct tenant_id column.

-- ──────────────────────────────────────────────
-- 1. approval_steps  ←  approval_chains (via chain_id)
-- ──────────────────────────────────────────────
ALTER TABLE approval_steps ADD COLUMN tenant_id UUID;
UPDATE approval_steps SET tenant_id = p.tenant_id FROM approval_chains p WHERE approval_steps.chain_id = p.id;
ALTER TABLE approval_steps ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE approval_steps ADD CONSTRAINT fk_approval_steps_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_approval_steps_tenant ON approval_steps(tenant_id);

-- ──────────────────────────────────────────────
-- 2. policy_versions  ←  policies (via policy_id)
-- ──────────────────────────────────────────────
ALTER TABLE policy_versions ADD COLUMN tenant_id UUID;
UPDATE policy_versions SET tenant_id = p.tenant_id FROM policies p WHERE policy_versions.policy_id = p.id;
ALTER TABLE policy_versions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE policy_versions ADD CONSTRAINT fk_policy_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_policy_versions_tenant ON policy_versions(tenant_id);

-- ──────────────────────────────────────────────
-- 3. raci_entries  ←  raci_matrices (via matrix_id)
-- ──────────────────────────────────────────────
ALTER TABLE raci_entries ADD COLUMN tenant_id UUID;
UPDATE raci_entries SET tenant_id = p.tenant_id FROM raci_matrices p WHERE raci_entries.matrix_id = p.id;
ALTER TABLE raci_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE raci_entries ADD CONSTRAINT fk_raci_entries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_raci_entries_tenant ON raci_entries(tenant_id);

-- ──────────────────────────────────────────────
-- 4. key_results  ←  okrs (via okr_id)
-- ──────────────────────────────────────────────
ALTER TABLE key_results ADD COLUMN tenant_id UUID;
UPDATE key_results SET tenant_id = p.tenant_id FROM okrs p WHERE key_results.okr_id = p.id;
ALTER TABLE key_results ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE key_results ADD CONSTRAINT fk_key_results_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_key_results_tenant ON key_results(tenant_id);

-- ──────────────────────────────────────────────
-- 5. project_dependencies  ←  projects (via project_id)
-- ──────────────────────────────────────────────
ALTER TABLE project_dependencies ADD COLUMN tenant_id UUID;
UPDATE project_dependencies SET tenant_id = p.tenant_id FROM projects p WHERE project_dependencies.project_id = p.id;
ALTER TABLE project_dependencies ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE project_dependencies ADD CONSTRAINT fk_project_dependencies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_project_dependencies_tenant ON project_dependencies(tenant_id);

-- ──────────────────────────────────────────────
-- 6. project_stakeholders  ←  projects (via project_id)
-- ──────────────────────────────────────────────
ALTER TABLE project_stakeholders ADD COLUMN tenant_id UUID;
UPDATE project_stakeholders SET tenant_id = p.tenant_id FROM projects p WHERE project_stakeholders.project_id = p.id;
ALTER TABLE project_stakeholders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE project_stakeholders ADD CONSTRAINT fk_project_stakeholders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_project_stakeholders_tenant ON project_stakeholders(tenant_id);

-- ──────────────────────────────────────────────
-- 7. time_entries  ←  work_items (via work_item_id)
-- ──────────────────────────────────────────────
ALTER TABLE time_entries ADD COLUMN tenant_id UUID;
UPDATE time_entries SET tenant_id = p.tenant_id FROM work_items p WHERE time_entries.work_item_id = p.id;
ALTER TABLE time_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);

-- ──────────────────────────────────────────────
-- 8. ticket_comments  ←  tickets (via ticket_id)
-- ──────────────────────────────────────────────
ALTER TABLE ticket_comments ADD COLUMN tenant_id UUID;
UPDATE ticket_comments SET tenant_id = p.tenant_id FROM tickets p WHERE ticket_comments.ticket_id = p.id;
ALTER TABLE ticket_comments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ticket_comments ADD CONSTRAINT fk_ticket_comments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_ticket_comments_tenant ON ticket_comments(tenant_id);

-- ──────────────────────────────────────────────
-- 9. ticket_status_history  ←  tickets (via ticket_id)
-- ──────────────────────────────────────────────
ALTER TABLE ticket_status_history ADD COLUMN tenant_id UUID;
UPDATE ticket_status_history SET tenant_id = p.tenant_id FROM tickets p WHERE ticket_status_history.ticket_id = p.id;
ALTER TABLE ticket_status_history ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE ticket_status_history ADD CONSTRAINT fk_ticket_status_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_ticket_status_history_tenant ON ticket_status_history(tenant_id);

-- ──────────────────────────────────────────────
-- 10. cmdb_relationships  ←  cmdb_items (via source_ci_id)
-- ──────────────────────────────────────────────
ALTER TABLE cmdb_relationships ADD COLUMN tenant_id UUID;
UPDATE cmdb_relationships SET tenant_id = p.tenant_id FROM cmdb_items p WHERE cmdb_relationships.source_ci_id = p.id;
ALTER TABLE cmdb_relationships ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE cmdb_relationships ADD CONSTRAINT fk_cmdb_relationships_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_cmdb_relationships_tenant ON cmdb_relationships(tenant_id);

-- ──────────────────────────────────────────────
-- 11. checklist_tasks  ←  checklists (via checklist_id)
-- ──────────────────────────────────────────────
ALTER TABLE checklist_tasks ADD COLUMN tenant_id UUID;
UPDATE checklist_tasks SET tenant_id = p.tenant_id FROM checklists p WHERE checklist_tasks.checklist_id = p.id;
ALTER TABLE checklist_tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE checklist_tasks ADD CONSTRAINT fk_checklist_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_checklist_tasks_tenant ON checklist_tasks(tenant_id);

-- ──────────────────────────────────────────────
-- 12. kb_article_versions  ←  kb_articles (via article_id)
-- ──────────────────────────────────────────────
ALTER TABLE kb_article_versions ADD COLUMN tenant_id UUID;
UPDATE kb_article_versions SET tenant_id = p.tenant_id FROM kb_articles p WHERE kb_article_versions.article_id = p.id;
ALTER TABLE kb_article_versions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE kb_article_versions ADD CONSTRAINT fk_kb_article_versions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_kb_article_versions_tenant ON kb_article_versions(tenant_id);

-- ──────────────────────────────────────────────
-- 13. kb_article_feedback  ←  kb_articles (via article_id)
-- ──────────────────────────────────────────────
ALTER TABLE kb_article_feedback ADD COLUMN tenant_id UUID;
UPDATE kb_article_feedback SET tenant_id = p.tenant_id FROM kb_articles p WHERE kb_article_feedback.article_id = p.id;
ALTER TABLE kb_article_feedback ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE kb_article_feedback ADD CONSTRAINT fk_kb_article_feedback_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_kb_article_feedback_tenant ON kb_article_feedback(tenant_id);

-- ──────────────────────────────────────────────
-- 14. risk_assessments  ←  risks (via risk_id)
-- ──────────────────────────────────────────────
ALTER TABLE risk_assessments ADD COLUMN tenant_id UUID;
UPDATE risk_assessments SET tenant_id = p.tenant_id FROM risks p WHERE risk_assessments.risk_id = p.id;
ALTER TABLE risk_assessments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE risk_assessments ADD CONSTRAINT fk_risk_assessments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_risk_assessments_tenant ON risk_assessments(tenant_id);

-- +goose Down
-- Reverse in opposite order

-- 14. risk_assessments
DROP INDEX IF EXISTS idx_risk_assessments_tenant;
ALTER TABLE risk_assessments DROP CONSTRAINT IF EXISTS fk_risk_assessments_tenant;
ALTER TABLE risk_assessments DROP COLUMN IF EXISTS tenant_id;

-- 13. kb_article_feedback
DROP INDEX IF EXISTS idx_kb_article_feedback_tenant;
ALTER TABLE kb_article_feedback DROP CONSTRAINT IF EXISTS fk_kb_article_feedback_tenant;
ALTER TABLE kb_article_feedback DROP COLUMN IF EXISTS tenant_id;

-- 12. kb_article_versions
DROP INDEX IF EXISTS idx_kb_article_versions_tenant;
ALTER TABLE kb_article_versions DROP CONSTRAINT IF EXISTS fk_kb_article_versions_tenant;
ALTER TABLE kb_article_versions DROP COLUMN IF EXISTS tenant_id;

-- 11. checklist_tasks
DROP INDEX IF EXISTS idx_checklist_tasks_tenant;
ALTER TABLE checklist_tasks DROP CONSTRAINT IF EXISTS fk_checklist_tasks_tenant;
ALTER TABLE checklist_tasks DROP COLUMN IF EXISTS tenant_id;

-- 10. cmdb_relationships
DROP INDEX IF EXISTS idx_cmdb_relationships_tenant;
ALTER TABLE cmdb_relationships DROP CONSTRAINT IF EXISTS fk_cmdb_relationships_tenant;
ALTER TABLE cmdb_relationships DROP COLUMN IF EXISTS tenant_id;

-- 9. ticket_status_history
DROP INDEX IF EXISTS idx_ticket_status_history_tenant;
ALTER TABLE ticket_status_history DROP CONSTRAINT IF EXISTS fk_ticket_status_history_tenant;
ALTER TABLE ticket_status_history DROP COLUMN IF EXISTS tenant_id;

-- 8. ticket_comments
DROP INDEX IF EXISTS idx_ticket_comments_tenant;
ALTER TABLE ticket_comments DROP CONSTRAINT IF EXISTS fk_ticket_comments_tenant;
ALTER TABLE ticket_comments DROP COLUMN IF EXISTS tenant_id;

-- 7. time_entries
DROP INDEX IF EXISTS idx_time_entries_tenant;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS fk_time_entries_tenant;
ALTER TABLE time_entries DROP COLUMN IF EXISTS tenant_id;

-- 6. project_stakeholders
DROP INDEX IF EXISTS idx_project_stakeholders_tenant;
ALTER TABLE project_stakeholders DROP CONSTRAINT IF EXISTS fk_project_stakeholders_tenant;
ALTER TABLE project_stakeholders DROP COLUMN IF EXISTS tenant_id;

-- 5. project_dependencies
DROP INDEX IF EXISTS idx_project_dependencies_tenant;
ALTER TABLE project_dependencies DROP CONSTRAINT IF EXISTS fk_project_dependencies_tenant;
ALTER TABLE project_dependencies DROP COLUMN IF EXISTS tenant_id;

-- 4. key_results
DROP INDEX IF EXISTS idx_key_results_tenant;
ALTER TABLE key_results DROP CONSTRAINT IF EXISTS fk_key_results_tenant;
ALTER TABLE key_results DROP COLUMN IF EXISTS tenant_id;

-- 3. raci_entries
DROP INDEX IF EXISTS idx_raci_entries_tenant;
ALTER TABLE raci_entries DROP CONSTRAINT IF EXISTS fk_raci_entries_tenant;
ALTER TABLE raci_entries DROP COLUMN IF EXISTS tenant_id;

-- 2. policy_versions
DROP INDEX IF EXISTS idx_policy_versions_tenant;
ALTER TABLE policy_versions DROP CONSTRAINT IF EXISTS fk_policy_versions_tenant;
ALTER TABLE policy_versions DROP COLUMN IF EXISTS tenant_id;

-- 1. approval_steps
DROP INDEX IF EXISTS idx_approval_steps_tenant;
ALTER TABLE approval_steps DROP CONSTRAINT IF EXISTS fk_approval_steps_tenant;
ALTER TABLE approval_steps DROP COLUMN IF EXISTS tenant_id;

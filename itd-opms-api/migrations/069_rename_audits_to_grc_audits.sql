-- +goose Up
-- Rename generic "audits" table to "grc_audits" to match service-layer queries
-- and avoid ambiguity with the system audit_events table.

ALTER TABLE audits RENAME TO grc_audits;

-- Rename dependent indexes
ALTER INDEX IF EXISTS idx_audits_tenant_status RENAME TO idx_grc_audits_tenant_status;
ALTER INDEX IF EXISTS idx_audits_created_by    RENAME TO idx_grc_audits_created_by;

-- Update foreign keys on child tables to point to the renamed table.
-- PostgreSQL tracks the table rename automatically for FK constraints,
-- but we update the audit_findings FK reference explicitly for clarity.
ALTER TABLE audit_findings DROP CONSTRAINT IF EXISTS audit_findings_audit_id_fkey;
ALTER TABLE audit_findings
    ADD CONSTRAINT audit_findings_audit_id_fkey
    FOREIGN KEY (audit_id) REFERENCES grc_audits(id) ON DELETE CASCADE;

ALTER TABLE evidence_collections DROP CONSTRAINT IF EXISTS evidence_collections_audit_id_fkey;
ALTER TABLE evidence_collections
    ADD CONSTRAINT evidence_collections_audit_id_fkey
    FOREIGN KEY (audit_id) REFERENCES grc_audits(id) ON DELETE CASCADE;

-- Rename trigger
DROP TRIGGER IF EXISTS trg_audits_updated ON grc_audits;
CREATE TRIGGER trg_grc_audits_updated
    BEFORE UPDATE ON grc_audits
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- +goose Down
ALTER TABLE grc_audits RENAME TO audits;

ALTER INDEX IF EXISTS idx_grc_audits_tenant_status RENAME TO idx_audits_tenant_status;
ALTER INDEX IF EXISTS idx_grc_audits_created_by    RENAME TO idx_audits_created_by;

ALTER TABLE audit_findings DROP CONSTRAINT IF EXISTS audit_findings_audit_id_fkey;
ALTER TABLE audit_findings
    ADD CONSTRAINT audit_findings_audit_id_fkey
    FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE;

ALTER TABLE evidence_collections DROP CONSTRAINT IF EXISTS evidence_collections_audit_id_fkey;
ALTER TABLE evidence_collections
    ADD CONSTRAINT evidence_collections_audit_id_fkey
    FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_grc_audits_updated ON audits;
CREATE TRIGGER trg_audits_updated
    BEFORE UPDATE ON audits
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

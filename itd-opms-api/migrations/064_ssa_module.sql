-- +goose Up
-- Migration 064: Server/Storage Allocation (SSA) Module
-- Implements the full data model for the SSA workflow as specified in ITD-OPMS/MOD/SSA-001.

-- ──────────────────────────────────────────────
-- Sequence for reference number generation
-- ──────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ssa_reference_seq START 1;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_ssa_next_reference()
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    yr TEXT;
BEGIN
    yr := TO_CHAR(NOW(), 'YYYY');
    seq_val := nextval('ssa_reference_seq');
    RETURN 'SSA-' || yr || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- ──────────────────────────────────────────────
-- 1. ssa_requests — Primary request entity
-- ──────────────────────────────────────────────
CREATE TABLE ssa_requests (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                 UUID NOT NULL,
    reference_no              VARCHAR(30) NOT NULL DEFAULT fn_ssa_next_reference(),
    requestor_id              UUID NOT NULL,
    requestor_name            VARCHAR(150) NOT NULL,
    requestor_staff_id        VARCHAR(20) NOT NULL,
    requestor_email           VARCHAR(150) NOT NULL,
    requestor_status          VARCHAR(20),
    division_office           VARCHAR(100) NOT NULL,
    status                    VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT','SUBMITTED','HOO_ENDORSED','ASD_ASSESSED','QCMD_ANALYSED',
            'APPR_DC_PENDING','APPR_SSO_PENDING','APPR_IMD_PENDING',
            'APPR_ASD_PENDING','APPR_SCAO_PENDING','FULLY_APPROVED',
            'SAN_PROVISIONED','DCO_CREATED','REJECTED','CANCELLED'
        )),
    extension                 VARCHAR(10),
    app_name                  VARCHAR(200) NOT NULL,
    db_name                   VARCHAR(100) NOT NULL,
    operating_system          VARCHAR(100) NOT NULL,
    server_type               VARCHAR(50) NOT NULL,
    vcpu_count                INTEGER NOT NULL DEFAULT 4,
    memory_gb                 INTEGER NOT NULL DEFAULT 8,
    disk_count                INTEGER,
    space_gb                  INTEGER NOT NULL DEFAULT 100,
    vlan_zone                 VARCHAR(200) NOT NULL,
    special_requirements      TEXT,
    justification             TEXT NOT NULL,
    present_space_allocated_gb INTEGER NOT NULL DEFAULT 0,
    present_space_in_use_gb   INTEGER NOT NULL DEFAULT 0,
    revision_count            INTEGER NOT NULL DEFAULT 0,
    rejected_stage            VARCHAR(40),
    submitted_at              TIMESTAMPTZ,
    completed_at              TIMESTAMPTZ,
    created_by                UUID,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by                UUID,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted                BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX idx_ssa_requests_reference ON ssa_requests(reference_no);
CREATE INDEX idx_ssa_requests_tenant_status ON ssa_requests(tenant_id, status);
CREATE INDEX idx_ssa_requests_tenant_requestor ON ssa_requests(tenant_id, requestor_id);
CREATE INDEX idx_ssa_requests_submitted ON ssa_requests(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_ssa_requests_division ON ssa_requests(tenant_id, division_office);

CREATE TRIGGER trg_ssa_requests_updated
    BEFORE UPDATE ON ssa_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 2. ssa_service_impacts — Service Impact Analysis entries
-- ──────────────────────────────────────────────
CREATE TABLE ssa_service_impacts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL,
    request_id          UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    risk_category       VARCHAR(50) NOT NULL
        CHECK (risk_category IN ('AUTHENTICATION','AVAILABILITY','PERFORMANCE','DATA_INTEGRITY')),
    risk_description    TEXT NOT NULL,
    mitigation_measures TEXT NOT NULL,
    severity            VARCHAR(20) NOT NULL
        CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    sequence_order      INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ssa_si_request ON ssa_service_impacts(request_id);

CREATE TRIGGER trg_ssa_service_impacts_updated
    BEFORE UPDATE ON ssa_service_impacts
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- ──────────────────────────────────────────────
-- 3. ssa_approvals — Approval/rejection records per stage
-- ──────────────────────────────────────────────
CREATE TABLE ssa_approvals (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    request_id        UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    stage             VARCHAR(40) NOT NULL,
    approver_id       UUID NOT NULL,
    approver_name     VARCHAR(150) NOT NULL,
    approver_role     VARCHAR(100) NOT NULL,
    decision          VARCHAR(20) NOT NULL
        CHECK (decision IN ('APPROVED','REJECTED','RETURNED')),
    remarks           TEXT,
    decided_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delegated_from_id UUID,
    sla_target_at     TIMESTAMPTZ NOT NULL,
    sla_breached      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ssa_approvals_request ON ssa_approvals(request_id);
CREATE INDEX idx_ssa_approvals_approver ON ssa_approvals(tenant_id, approver_id);
CREATE INDEX idx_ssa_approvals_stage ON ssa_approvals(request_id, stage);

-- ──────────────────────────────────────────────
-- 4. ssa_asd_assessments — ASD technical feasibility
-- ──────────────────────────────────────────────
CREATE TABLE ssa_asd_assessments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL,
    request_id               UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    assessor_id              UUID NOT NULL,
    assessment_outcome       VARCHAR(20) NOT NULL
        CHECK (assessment_outcome IN ('FEASIBLE','CONDITIONALLY_FEASIBLE','NOT_FEASIBLE')),
    os_compatibility_check   BOOLEAN NOT NULL DEFAULT FALSE,
    resource_adequacy_check  BOOLEAN NOT NULL DEFAULT FALSE,
    security_compliance_check BOOLEAN NOT NULL DEFAULT FALSE,
    ha_feasibility_check     BOOLEAN NOT NULL DEFAULT FALSE,
    conditions               TEXT,
    technical_notes          TEXT,
    assessed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ssa_asd_request ON ssa_asd_assessments(request_id);

-- ──────────────────────────────────────────────
-- 5. ssa_qcmd_analyses — QCMD capacity analysis
-- ──────────────────────────────────────────────
CREATE TABLE ssa_qcmd_analyses (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL,
    request_id                  UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    analyst_id                  UUID NOT NULL,
    server_reference            VARCHAR(50) NOT NULL,
    available_storage_tb        DECIMAL(10,2) NOT NULL,
    space_requested_gb          INTEGER NOT NULL,
    storage_after_allocation_tb DECIMAL(10,2) NOT NULL,
    justification_notes         TEXT,
    analysed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ssa_qcmd_request ON ssa_qcmd_analyses(request_id);

-- ──────────────────────────────────────────────
-- 6. ssa_san_provisionings — SAN provisioning record
-- ──────────────────────────────────────────────
CREATE TABLE ssa_san_provisionings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL,
    request_id           UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    administrator_id     UUID NOT NULL,
    port                 VARCHAR(30) NOT NULL,
    cu                   VARCHAR(30) NOT NULL,
    ldev                 VARCHAR(30) NOT NULL,
    lun                  VARCHAR(30) NOT NULL,
    acp                  VARCHAR(30) NOT NULL,
    size_allocated       VARCHAR(30) NOT NULL,
    hba_type             VARCHAR(100),
    hba_driver_version   VARCHAR(50),
    wwn_no               VARCHAR(50),
    host_name            VARCHAR(100),
    san_switch_no_port   VARCHAR(100),
    san_switch_zone_name VARCHAR(100),
    remarks              TEXT,
    provisioned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ssa_san_request ON ssa_san_provisionings(request_id);

-- ──────────────────────────────────────────────
-- 7. ssa_dco_servers — DCO server creation record
-- ──────────────────────────────────────────────
CREATE TABLE ssa_dco_servers (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    request_id        UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    creator_id        UUID NOT NULL,
    creator_name      VARCHAR(150) NOT NULL,
    creator_staff_id  VARCHAR(20) NOT NULL,
    server_name       VARCHAR(100) NOT NULL,
    ip_address        VARCHAR(45) NOT NULL,
    zone              VARCHAR(100) NOT NULL,
    created_server_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ssa_dco_request ON ssa_dco_servers(request_id);

-- ──────────────────────────────────────────────
-- 8. ssa_audit_logs — Immutable audit trail
-- ──────────────────────────────────────────────
CREATE TABLE ssa_audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     UUID NOT NULL,
    request_id    UUID NOT NULL REFERENCES ssa_requests(id) ON DELETE CASCADE,
    event_type    VARCHAR(50) NOT NULL
        CHECK (event_type IN ('STATE_CHANGE','DATA_EDIT','NOTIFICATION','SLA_BREACH','ESCALATION')),
    from_state    VARCHAR(30),
    to_state      VARCHAR(30),
    actor_id      UUID NOT NULL,
    actor_name    VARCHAR(150) NOT NULL,
    description   TEXT NOT NULL,
    metadata_json JSONB,
    ip_address    VARCHAR(45),
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ssa_audit_request ON ssa_audit_logs(request_id);
CREATE INDEX idx_ssa_audit_tenant_time ON ssa_audit_logs(tenant_id, occurred_at DESC);

-- Prevent updates/deletes on audit log (append-only)
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_ssa_audit_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ssa_audit_logs is append-only. UPDATE and DELETE are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_ssa_audit_no_update
    BEFORE UPDATE ON ssa_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION fn_ssa_audit_immutable();

CREATE TRIGGER trg_ssa_audit_no_delete
    BEFORE DELETE ON ssa_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION fn_ssa_audit_immutable();

-- ──────────────────────────────────────────────
-- 9. ssa_delegations — Approval delegation management
-- ──────────────────────────────────────────────
CREATE TABLE ssa_delegations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL,
    delegator_id   UUID NOT NULL,
    delegate_id    UUID NOT NULL,
    stage          VARCHAR(40) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to   TIMESTAMPTZ NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    reason         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ssa_delegations_tenant ON ssa_delegations(tenant_id, is_active);
CREATE INDEX idx_ssa_delegations_delegator ON ssa_delegations(delegator_id, is_active);
CREATE INDEX idx_ssa_delegations_delegate ON ssa_delegations(delegate_id, is_active);

CREATE TRIGGER trg_ssa_delegations_updated
    BEFORE UPDATE ON ssa_delegations
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- +goose Down
DROP TABLE IF EXISTS ssa_delegations;
DROP TRIGGER IF EXISTS trg_ssa_audit_no_delete ON ssa_audit_logs;
DROP TRIGGER IF EXISTS trg_ssa_audit_no_update ON ssa_audit_logs;
DROP FUNCTION IF EXISTS fn_ssa_audit_immutable();
DROP TABLE IF EXISTS ssa_audit_logs;
DROP TABLE IF EXISTS ssa_dco_servers;
DROP TABLE IF EXISTS ssa_san_provisionings;
DROP TABLE IF EXISTS ssa_qcmd_analyses;
DROP TABLE IF EXISTS ssa_asd_assessments;
DROP TABLE IF EXISTS ssa_approvals;
DROP TABLE IF EXISTS ssa_service_impacts;
DROP TABLE IF EXISTS ssa_requests;
DROP FUNCTION IF EXISTS fn_ssa_next_reference();
DROP SEQUENCE IF EXISTS ssa_reference_seq;

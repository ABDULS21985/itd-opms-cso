-- +goose Up
-- Migration 096: ITSM workflow enforcement.
-- Adds DB-level status constraints and transition guards matching the backend state machines.

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
    CHECK (status IN (
        'logged', 'classified', 'assigned', 'in_progress',
        'pending_customer', 'pending_vendor', 'resolved', 'closed', 'cancelled',
        'draft', 'submitted', 'assessing', 'cab_review', 'approved',
        'rejected', 'deferred', 'scheduled', 'implementing', 'implemented',
        'failed', 'rolled_back', 'pir_pending', 'investigating'
    ));

ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;
ALTER TABLE service_requests ADD CONSTRAINT service_requests_status_check
    CHECK (status IN (
        'pending_approval', 'approved', 'rejected',
        'in_progress', 'fulfilled', 'closed', 'cancelled'
    ));

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_ticket_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    uses_change_lifecycle BOOLEAN;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        uses_change_lifecycle :=
            OLD.status IN (
                'draft', 'submitted', 'assessing', 'cab_review', 'approved',
                'rejected', 'deferred', 'scheduled', 'implementing', 'implemented',
                'failed', 'rolled_back', 'pir_pending'
            )
            OR NEW.status IN (
                'draft', 'submitted', 'assessing', 'cab_review', 'approved',
                'rejected', 'deferred', 'scheduled', 'implementing', 'implemented',
                'failed', 'rolled_back', 'pir_pending'
            );

        IF uses_change_lifecycle THEN
            IF NOT (
                (OLD.status = 'draft' AND NEW.status = 'submitted') OR
                (OLD.status = 'submitted' AND NEW.status = 'assessing') OR
                (OLD.status = 'assessing' AND NEW.status IN ('cab_review', 'approved', 'rejected')) OR
                (OLD.status = 'cab_review' AND NEW.status IN ('approved', 'rejected', 'deferred')) OR
                (OLD.status = 'approved' AND NEW.status = 'scheduled') OR
                (OLD.status = 'deferred' AND NEW.status = 'assessing') OR
                (OLD.status = 'scheduled' AND NEW.status = 'implementing') OR
                (OLD.status = 'implementing' AND NEW.status IN ('implemented', 'failed', 'rolled_back')) OR
                (OLD.status = 'implemented' AND NEW.status IN ('pir_pending', 'closed')) OR
                (OLD.status = 'failed' AND NEW.status = 'investigating') OR
                (OLD.status = 'rolled_back' AND NEW.status = 'closed') OR
                (OLD.status = 'pir_pending' AND NEW.status = 'closed') OR
                (OLD.status = 'investigating' AND NEW.status = 'scheduled')
            ) THEN
                RAISE EXCEPTION 'invalid change transition: % -> %', OLD.status, NEW.status
                    USING ERRCODE = '23514';
            END IF;
        ELSE
            IF NOT (
                (OLD.status = 'logged' AND NEW.status IN ('classified', 'assigned', 'cancelled')) OR
                (OLD.status = 'classified' AND NEW.status IN ('assigned', 'cancelled')) OR
                (OLD.status = 'assigned' AND NEW.status IN ('in_progress', 'cancelled')) OR
                (OLD.status = 'in_progress' AND NEW.status IN ('pending_customer', 'pending_vendor', 'resolved', 'cancelled')) OR
                (OLD.status = 'pending_customer' AND NEW.status IN ('in_progress', 'resolved', 'cancelled')) OR
                (OLD.status = 'pending_vendor' AND NEW.status IN ('in_progress', 'resolved', 'cancelled')) OR
                (OLD.status = 'resolved' AND NEW.status IN ('closed', 'in_progress'))
            ) THEN
                RAISE EXCEPTION 'invalid ticket transition: % -> %', OLD.status, NEW.status
                    USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_validate_ticket_status_transition ON tickets;
CREATE TRIGGER trg_validate_ticket_status_transition
    BEFORE UPDATE OF status ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_ticket_status_transition();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_problem_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'logged' AND NEW.status = 'investigating') OR
            (OLD.status = 'investigating' AND NEW.status IN ('root_cause_identified', 'known_error')) OR
            (OLD.status = 'root_cause_identified' AND NEW.status IN ('known_error', 'resolved')) OR
            (OLD.status = 'known_error' AND NEW.status = 'resolved') OR
            (OLD.status = 'resolved' AND NEW.status = 'investigating')
        ) THEN
            RAISE EXCEPTION 'invalid problem transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_validate_problem_status_transition ON problems;
CREATE TRIGGER trg_validate_problem_status_transition
    BEFORE UPDATE OF status ON problems
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_problem_status_transition();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_service_request_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'pending_approval' AND NEW.status IN ('approved', 'rejected', 'cancelled')) OR
            (OLD.status = 'approved' AND NEW.status IN ('in_progress', 'fulfilled', 'cancelled')) OR
            (OLD.status = 'in_progress' AND NEW.status IN ('fulfilled', 'cancelled')) OR
            (OLD.status = 'fulfilled' AND NEW.status = 'closed')
        ) THEN
            RAISE EXCEPTION 'invalid service request transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_validate_service_request_status_transition ON service_requests;
CREATE TRIGGER trg_validate_service_request_status_transition
    BEFORE UPDATE OF status ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_service_request_status_transition();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_major_incident_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'declared' AND NEW.status = 'investigating') OR
            (OLD.status = 'investigating' AND NEW.status = 'mitigating') OR
            (OLD.status = 'mitigating' AND NEW.status = 'mitigated') OR
            (OLD.status = 'mitigated' AND NEW.status IN ('monitoring', 'resolved')) OR
            (OLD.status = 'monitoring' AND NEW.status = 'resolved') OR
            (OLD.status = 'resolved' AND NEW.status = 'pir_pending') OR
            (OLD.status = 'pir_pending' AND NEW.status = 'closed')
        ) THEN
            RAISE EXCEPTION 'invalid major incident transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_validate_major_incident_status_transition ON major_incident_records;
CREATE TRIGGER trg_validate_major_incident_status_transition
    BEFORE UPDATE OF status ON major_incident_records
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_major_incident_status_transition();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_validate_cab_meeting_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
            (OLD.status = 'scheduled' AND NEW.status IN ('in_progress', 'cancelled')) OR
            (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
        ) THEN
            RAISE EXCEPTION 'invalid CAB meeting transition: % -> %', OLD.status, NEW.status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_validate_cab_meeting_status_transition ON cab_meetings;
CREATE TRIGGER trg_validate_cab_meeting_status_transition
    BEFORE UPDATE OF status ON cab_meetings
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_cab_meeting_status_transition();

-- +goose Down
DROP TRIGGER IF EXISTS trg_validate_cab_meeting_status_transition ON cab_meetings;
DROP FUNCTION IF EXISTS fn_validate_cab_meeting_status_transition();

DROP TRIGGER IF EXISTS trg_validate_major_incident_status_transition ON major_incident_records;
DROP FUNCTION IF EXISTS fn_validate_major_incident_status_transition();

DROP TRIGGER IF EXISTS trg_validate_service_request_status_transition ON service_requests;
DROP FUNCTION IF EXISTS fn_validate_service_request_status_transition();

DROP TRIGGER IF EXISTS trg_validate_problem_status_transition ON problems;
DROP FUNCTION IF EXISTS fn_validate_problem_status_transition();

DROP TRIGGER IF EXISTS trg_validate_ticket_status_transition ON tickets;
DROP FUNCTION IF EXISTS fn_validate_ticket_status_transition();

-- +goose Up
-- Migration 074: ESM ticket type-specific numbering sequences
-- Replaces the shared ticket_seq with per-type sequences so that
-- INC-, CHG-, and SR- numbers are each gapless within their type.
-- Sequences start at 1001 to safely clear all existing seed data.

CREATE SEQUENCE IF NOT EXISTS incident_number_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS change_number_seq   START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS sr_number_seq       START WITH 1001;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION fn_generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        CASE NEW.type
            WHEN 'incident' THEN
                NEW.ticket_number := 'INC-' || LPAD(nextval('incident_number_seq')::text, 6, '0');
            WHEN 'change' THEN
                NEW.ticket_number := 'CHG-' || LPAD(nextval('change_number_seq')::text, 6, '0');
            WHEN 'service_request' THEN
                NEW.ticket_number := 'SR-' || LPAD(nextval('sr_number_seq')::text, 6, '0');
            ELSE
                NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_seq')::text, 6, '0');
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd


-- +goose Down
-- Restore original function that uses the shared ticket_seq for all types.

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

DROP SEQUENCE IF EXISTS incident_number_seq;
DROP SEQUENCE IF EXISTS change_number_seq;
DROP SEQUENCE IF EXISTS sr_number_seq;

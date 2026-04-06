-- +goose Up
-- Migration 058: Re-insert users referenced by ITSM ticket seeds (migration 057).
-- These were removed in migration 033 but are needed for ticket reporter/assignee resolution.

INSERT INTO users (id, email, display_name, job_title, department, office, tenant_id, is_active, password_hash)
VALUES
  ('b57c7521-672f-307c-9878-e3504b0e18d7', 'abubakar.mohammed@cbn.gov.ng',  'Abubakar Mohammed',  'Division Head',              'AMD',       'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('e712da03-d912-0288-98e7-7907f066d7cd', 'fatima.ibrahim@cbn.gov.ng',     'Fatima Ibrahim',     'Office Head, BISO',          'AMD-BISO',  'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('5db8e9fc-125b-4883-62c3-372b18e64d33', 'chidinma.eze@cbn.gov.ng',      'Chidinma Eze',       'Senior Systems Analyst',     'AMD-BISO',  'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', 'chukwuemeka.okafor@cbn.gov.ng','Chukwuemeka Okafor',  'Office Head, CSO',           'AMD-CSO',   'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('90377934-1644-8547-b018-c4bb2449aaef', 'amina.yusuf@cbn.gov.ng',       'Amina Yusuf',        'Office Head, FSSO',          'AMD-FSSO',  'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('f3947e51-26fa-f488-4a13-e65c608d2e7b', 'oluwaseun.adeyemi@cbn.gov.ng', 'Oluwaseun Adeyemi',  'Office Head, ISSO',          'AMD-ISSO',  'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('c59b492e-b071-8565-6194-633cad81d471', 'musa.abdullahi@cbn.gov.ng',    'Musa Abdullahi',     'Office Head, POSO',          'AMD-POSO',  'Head Office', '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (id) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  job_title     = EXCLUDED.job_title,
  department    = EXCLUDED.department,
  office        = EXCLUDED.office,
  is_active     = true;

-- +goose Down
-- No-op: leave users in place (migration 033 handles cleanup if needed).
SELECT 1;

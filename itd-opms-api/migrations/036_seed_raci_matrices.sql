-- +goose Up
-- Migration 034: Seed RACI Matrices with realistic IT governance data
-- Seeds: 10 RACI matrices with 56 entries across various IT processes

-- ══════════════════════════════════════════════
-- Constants:
--   Tenant:  00000000-0000-0000-0000-000000000001 (ITD)
--   Admin:   20000000-0000-0000-0000-000000000001 (System Administrator)
-- ══════════════════════════════════════════════

-- Staff IDs shorthand (from 032_seed_amd_staff):
--   U01 = f782c2e1-6050-4ce0-a609-224e484328d2  (Shadrach Abdul)
--   U02 = f0896cd0-10a3-4eb6-8727-fbc2913a26d8  (Abba Sulaiman Abubakar)
--   U03 = 4efad8ea-2252-4dbf-be05-14c173a1a2ea  (Nafisah Abdu Abubakar)
--   U04 = fb98959e-7b93-47ee-b669-0b3f16bb96b7  (Tosin Samuel Adegoke)
--   U05 = 09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b  (Olatayo Emmanuel Adeoye)
--   U06 = cb3fdfc6-17d0-451d-9cff-3884df293575  (Fatima Gachi Ahmed)
--   U07 = 7c8d2bc7-44d5-4f2f-8f21-247cff4a361e  (Babatope Adebisi Ajewole)
--   U08 = 71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8  (Ayokunle Joseph Ajileye)
--   U09 = 961b78e7-776e-4fcd-a728-eb9d1ebe4c12  (Abdulhamid Aliyu)
--   U10 = 9bef795c-2ada-4b34-9d2f-15a318c7b496  (Muhammad Aminu Aliyu)
--   U11 = 175a82ee-5aa2-459f-9fb0-63a00d1ae21d  (Olumide Babafemi Aluko)
--   U12 = 09aeba21-90d8-4cad-bb88-320dd35b7db5  (Victor Ndubuisi Awoke)
--   U13 = 5064c947-bb1c-45e3-868b-65d4c987d998  (Aliyu Mohammed Bashir)
--   U14 = 4038facc-92fa-46af-8398-40de62b68c4e  (John Oghenekevbe Brown-Asakpa)
--   U15 = 9989e917-eb2a-43d9-b410-00b3b00c658d  (Abduljalil Sani Chobe)
--   U16 = b2c4a01b-6771-4ccf-99e0-9b402e54f141  (Bello Ahmed Dangiwa)
--   U17 = f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49  (Abiola Ibukun Faturoti)
--   U18 = 2fe19db4-d46e-4d94-aa47-115fd59fb3cd  (Abubakar Tukur Garba)
--   U19 = 1ee2c7e4-2bf0-435e-ac02-1969e924011f  (Sulaiman Olalekan Hassan)
--   U20 = 11312f3e-be19-4ea6-bfb9-593d126f3558  (Mubarak Abdullahi Ibrahim)
--   U21 = 7600e3bf-ab4e-4040-b44a-0056665ec663  (Yahaya Isah)
--   U22 = 5753c598-9e2f-4dcb-bdd8-710104484cd2  (Oloruntobi Emmanuel Junaid)
--   U23 = e23bb508-44bb-4ea4-b75a-e4114b526ce8  (Abdulrahman Muhammad)
--   U24 = b3c458fc-071f-437c-962a-0d1a81b09cfc  (Jibrin Muhammad)
--   U25 = 818035e0-689b-4f0c-8e0c-803123349836  (Ruqayya Muhammad)
--   U26 = c1e9cd35-053b-44cf-b5f9-c0c439fa01d6  (Aliyu Tunde Muritala)
--   U27 = e1fb9fed-bc64-4cff-87ea-defe8c09eae8  (Jaafar A. Nasir)
--   U28 = 41300057-cefe-4eb3-ba63-f6cf004786c8  (Ugochukwu Chikezie Okereke)
--   U29 = 44011aaf-f649-41e9-9d6e-16911e54fb0b  (Samuel Adedotun Olugbenro)
--   U30 = 53b6dcae-9565-4397-94b3-96bc4420c3cc  (Adebola Olaniyi Omolaja)
--   U31 = fbbfe490-fc9a-4be0-b371-e4cf26fd776a  (Clement Fisayo Oyebode)
--   U32 = 04c5363c-5b01-4a11-907d-a57540551134  (Adekunle Renner)
--   U33 = a9d1cb7b-d8d7-45c0-af3f-ef7dcc6d58fe  (Ibrahim Adamu Shehu)
--   U34 = c60527eb-2d3f-4674-91a5-f7da13f1f81f  (Kenneth Christopher Ugwoke)
--   U35 = a1096387-7d43-4302-b6c3-df110e3d9e34  (Aiman Muhammad Uwais)
--   U36 = 6be192d9-d89f-4b72-a1e9-d908657f62fb  (Dauda Ademola Yakubu)
--   U37 = 20e9695a-5412-4bc1-b838-868df2471e27  (Ibrahim Zakariyau)

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 1: IT Change Management Process
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'IT Change Management Process',
  'process',
  NULL,
  'Defines roles and responsibilities for the end-to-end IT change management lifecycle including request, review, approval, implementation, and post-change validation.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0001-000000000001', 'Submit Change Request', ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','fb98959e-7b93-47ee-b669-0b3f16bb96b7']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b']::uuid[], ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575','7c8d2bc7-44d5-4f2f-8f21-247cff4a361e']::uuid[], 'Any team member can submit a change request via the ITSM portal'),
  ('b0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0001-000000000001', 'Classify and Prioritize Change', ARRAY['09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], ARRAY['961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], 'Change manager classifies as standard, normal, or emergency'),
  ('b0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0001-000000000001', 'Conduct Impact Assessment', ARRAY['71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8','961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], '09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', ARRAY['9bef795c-2ada-4b34-9d2f-15a318c7b496','175a82ee-5aa2-459f-9fb0-63a00d1ae21d']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], 'Technical leads assess impact on infrastructure and dependent services'),
  ('b0000000-0000-0000-0001-000000000004', 'a0000000-0000-0000-0001-000000000001', 'Approve or Reject Change', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b','71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','fb98959e-7b93-47ee-b669-0b3f16bb96b7','cb3fdfc6-17d0-451d-9cff-3884df293575']::uuid[], 'CAB reviews and approves changes above threshold'),
  ('b0000000-0000-0000-0001-000000000005', 'a0000000-0000-0000-0001-000000000001', 'Implement Change', ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','fb98959e-7b93-47ee-b669-0b3f16bb96b7','09aeba21-90d8-4cad-bb88-320dd35b7db5']::uuid[], '09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', ARRAY['71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], 'Assigned engineers execute the change during approved window'),
  ('b0000000-0000-0000-0001-000000000006', 'a0000000-0000-0000-0001-000000000001', 'Post-Implementation Review', ARRAY['09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b','71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','fb98959e-7b93-47ee-b669-0b3f16bb96b7']::uuid[], ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575','7c8d2bc7-44d5-4f2f-8f21-247cff4a361e','961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], 'Validate change was successful and document lessons learned'),
  ('b0000000-0000-0000-0001-000000000007', 'a0000000-0000-0000-0001-000000000001', 'Execute Rollback Procedure', ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','09aeba21-90d8-4cad-bb88-320dd35b7db5']::uuid[], '09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', ARRAY['20000000-0000-0000-0000-000000000001','71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575','961b78e7-776e-4fcd-a728-eb9d1ebe4c12','9bef795c-2ada-4b34-9d2f-15a318c7b496']::uuid[], 'Triggered when change fails validation or causes incidents');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 2: IT Service Request Management
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'IT Service Request Management',
  'process',
  NULL,
  'Covers the lifecycle of IT service requests from submission through fulfillment, including provisioning, access management, and hardware/software requests.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0001-000000000002', 'Log Service Request', ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998']::uuid[], '4038facc-92fa-46af-8398-40de62b68c4e', ARRAY['9989e917-eb2a-43d9-b410-00b3b00c658d']::uuid[], ARRAY['b2c4a01b-6771-4ccf-99e0-9b402e54f141']::uuid[], 'Service desk logs incoming requests with required details'),
  ('b0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0001-000000000002', 'Categorize and Route Request', ARRAY['4038facc-92fa-46af-8398-40de62b68c4e']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','9989e917-eb2a-43d9-b410-00b3b00c658d']::uuid[], ARRAY['b2c4a01b-6771-4ccf-99e0-9b402e54f141','f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49']::uuid[], 'Route to appropriate team based on request category'),
  ('b0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0001-000000000002', 'Approve High-Value Requests', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['4038facc-92fa-46af-8398-40de62b68c4e','2fe19db4-d46e-4d94-aa47-115fd59fb3cd']::uuid[], ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','9989e917-eb2a-43d9-b410-00b3b00c658d']::uuid[], 'Requests above cost threshold require management approval'),
  ('b0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0001-000000000002', 'Fulfill Service Request', ARRAY['9989e917-eb2a-43d9-b410-00b3b00c658d','b2c4a01b-6771-4ccf-99e0-9b402e54f141']::uuid[], '4038facc-92fa-46af-8398-40de62b68c4e', ARRAY['f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49']::uuid[], ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','20000000-0000-0000-0000-000000000001']::uuid[], 'Assigned technician provisions the requested service or asset'),
  ('b0000000-0000-0000-0002-000000000005', 'a0000000-0000-0000-0001-000000000002', 'Verify and Close Request', ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998']::uuid[], '4038facc-92fa-46af-8398-40de62b68c4e', ARRAY['9989e917-eb2a-43d9-b410-00b3b00c658d']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], 'Confirm with requester that service has been delivered satisfactorily'),
  ('b0000000-0000-0000-0002-000000000006', 'a0000000-0000-0000-0001-000000000002', 'Generate Monthly SLA Report', ARRAY['4038facc-92fa-46af-8398-40de62b68c4e']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998']::uuid[], ARRAY['9989e917-eb2a-43d9-b410-00b3b00c658d','b2c4a01b-6771-4ccf-99e0-9b402e54f141','f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49','2fe19db4-d46e-4d94-aa47-115fd59fb3cd']::uuid[], 'Monthly report on request volumes, resolution times, and SLA adherence');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 3: Cybersecurity Incident Response
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Cybersecurity Incident Response',
  'process',
  NULL,
  'Outlines the RACI for cybersecurity incident detection, containment, eradication, recovery, and post-incident analysis. Aligns with NIST SP 800-61 incident handling framework.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0003-000000000001', 'a0000000-0000-0000-0001-000000000003', 'Detect and Triage Security Alert', ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f','11312f3e-be19-4ea6-bfb9-593d126f3558']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['7600e3bf-ab4e-4040-b44a-0056665ec663']::uuid[], ARRAY['5753c598-9e2f-4dcb-bdd8-710104484cd2']::uuid[], 'SOC analysts monitor SIEM and classify alerts by severity'),
  ('b0000000-0000-0000-0003-000000000002', 'a0000000-0000-0000-0001-000000000003', 'Escalate Critical Incident', ARRAY['7600e3bf-ab4e-4040-b44a-0056665ec663']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f','11312f3e-be19-4ea6-bfb9-593d126f3558']::uuid[], ARRAY['e23bb508-44bb-4ea4-b75a-e4114b526ce8','b3c458fc-071f-437c-962a-0d1a81b09cfc','818035e0-689b-4f0c-8e0c-803123349836']::uuid[], 'P1/P2 incidents escalated to CISO and incident commander within 15 minutes'),
  ('b0000000-0000-0000-0003-000000000003', 'a0000000-0000-0000-0001-000000000003', 'Contain and Isolate Threat', ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f','11312f3e-be19-4ea6-bfb9-593d126f3558','7600e3bf-ab4e-4040-b44a-0056665ec663']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['5753c598-9e2f-4dcb-bdd8-710104484cd2','e23bb508-44bb-4ea4-b75a-e4114b526ce8']::uuid[], ARRAY['b3c458fc-071f-437c-962a-0d1a81b09cfc']::uuid[], 'Isolate affected systems, block malicious IPs, revoke compromised credentials'),
  ('b0000000-0000-0000-0003-000000000004', 'a0000000-0000-0000-0001-000000000003', 'Eradicate and Remediate', ARRAY['5753c598-9e2f-4dcb-bdd8-710104484cd2','e23bb508-44bb-4ea4-b75a-e4114b526ce8']::uuid[], '7600e3bf-ab4e-4040-b44a-0056665ec663', ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f','11312f3e-be19-4ea6-bfb9-593d126f3558']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','b3c458fc-071f-437c-962a-0d1a81b09cfc']::uuid[], 'Remove malware, patch vulnerabilities, rebuild compromised systems'),
  ('b0000000-0000-0000-0003-000000000005', 'a0000000-0000-0000-0001-000000000003', 'Restore Services and Verify', ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f','5753c598-9e2f-4dcb-bdd8-710104484cd2']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['7600e3bf-ab4e-4040-b44a-0056665ec663','e23bb508-44bb-4ea4-b75a-e4114b526ce8']::uuid[], ARRAY['11312f3e-be19-4ea6-bfb9-593d126f3558','b3c458fc-071f-437c-962a-0d1a81b09cfc','818035e0-689b-4f0c-8e0c-803123349836']::uuid[], 'Bring systems back online with enhanced monitoring'),
  ('b0000000-0000-0000-0003-000000000006', 'a0000000-0000-0000-0001-000000000003', 'Conduct Post-Incident Review', ARRAY['7600e3bf-ab4e-4040-b44a-0056665ec663']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f','11312f3e-be19-4ea6-bfb9-593d126f3558','5753c598-9e2f-4dcb-bdd8-710104484cd2','e23bb508-44bb-4ea4-b75a-e4114b526ce8']::uuid[], ARRAY['b3c458fc-071f-437c-962a-0d1a81b09cfc','818035e0-689b-4f0c-8e0c-803123349836','c1e9cd35-053b-44cf-b5f9-c0c439fa01d6']::uuid[], 'Document timeline, root cause, lessons learned, and improvement actions');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 4: Software Development Lifecycle (SDLC)
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Software Development Lifecycle (SDLC)',
  'process',
  NULL,
  'Defines responsibilities across the full software development lifecycle including requirements gathering, design, development, testing, deployment, and maintenance.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0004-000000000001', 'a0000000-0000-0000-0001-000000000004', 'Gather and Document Requirements', ARRAY['c1e9cd35-053b-44cf-b5f9-c0c439fa01d6','e1fb9fed-bc64-4cff-87ea-defe8c09eae8']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['41300057-cefe-4eb3-ba63-f6cf004786c8','44011aaf-f649-41e9-9d6e-16911e54fb0b']::uuid[], ARRAY['53b6dcae-9565-4397-94b3-96bc4420c3cc']::uuid[], 'Business analysts work with stakeholders to define functional and non-functional requirements'),
  ('b0000000-0000-0000-0004-000000000002', 'a0000000-0000-0000-0001-000000000004', 'Create System Architecture and Design', ARRAY['41300057-cefe-4eb3-ba63-f6cf004786c8']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['c1e9cd35-053b-44cf-b5f9-c0c439fa01d6','44011aaf-f649-41e9-9d6e-16911e54fb0b','53b6dcae-9565-4397-94b3-96bc4420c3cc']::uuid[], ARRAY['e1fb9fed-bc64-4cff-87ea-defe8c09eae8','fbbfe490-fc9a-4be0-b371-e4cf26fd776a']::uuid[], 'Solution architect designs system components, integrations, and data flows'),
  ('b0000000-0000-0000-0004-000000000003', 'a0000000-0000-0000-0001-000000000004', 'Develop Application Code', ARRAY['44011aaf-f649-41e9-9d6e-16911e54fb0b','53b6dcae-9565-4397-94b3-96bc4420c3cc','fbbfe490-fc9a-4be0-b371-e4cf26fd776a']::uuid[], '41300057-cefe-4eb3-ba63-f6cf004786c8', ARRAY['c1e9cd35-053b-44cf-b5f9-c0c439fa01d6']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','e1fb9fed-bc64-4cff-87ea-defe8c09eae8']::uuid[], 'Development team implements features following coding standards and design patterns'),
  ('b0000000-0000-0000-0004-000000000004', 'a0000000-0000-0000-0001-000000000004', 'Conduct Code Review', ARRAY['41300057-cefe-4eb3-ba63-f6cf004786c8','04c5363c-5b01-4a11-907d-a57540551134']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['44011aaf-f649-41e9-9d6e-16911e54fb0b','53b6dcae-9565-4397-94b3-96bc4420c3cc']::uuid[], ARRAY['fbbfe490-fc9a-4be0-b371-e4cf26fd776a']::uuid[], 'Peer reviews ensure code quality, security, and adherence to standards'),
  ('b0000000-0000-0000-0004-000000000005', 'a0000000-0000-0000-0001-000000000004', 'Execute QA Testing', ARRAY['04c5363c-5b01-4a11-907d-a57540551134','a9d1cb7b-d8d7-45c0-af3f-ef7dcc6d58fe']::uuid[], '41300057-cefe-4eb3-ba63-f6cf004786c8', ARRAY['44011aaf-f649-41e9-9d6e-16911e54fb0b','c1e9cd35-053b-44cf-b5f9-c0c439fa01d6']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','53b6dcae-9565-4397-94b3-96bc4420c3cc']::uuid[], 'QA team performs functional, regression, performance, and security testing'),
  ('b0000000-0000-0000-0004-000000000006', 'a0000000-0000-0000-0001-000000000004', 'Deploy to Production', ARRAY['53b6dcae-9565-4397-94b3-96bc4420c3cc','fbbfe490-fc9a-4be0-b371-e4cf26fd776a']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['41300057-cefe-4eb3-ba63-f6cf004786c8','04c5363c-5b01-4a11-907d-a57540551134']::uuid[], ARRAY['c1e9cd35-053b-44cf-b5f9-c0c439fa01d6','e1fb9fed-bc64-4cff-87ea-defe8c09eae8','44011aaf-f649-41e9-9d6e-16911e54fb0b']::uuid[], 'DevOps team deploys using CI/CD pipeline with blue-green strategy'),
  ('b0000000-0000-0000-0004-000000000007', 'a0000000-0000-0000-0001-000000000004', 'Provide Production Support', ARRAY['fbbfe490-fc9a-4be0-b371-e4cf26fd776a','44011aaf-f649-41e9-9d6e-16911e54fb0b']::uuid[], '41300057-cefe-4eb3-ba63-f6cf004786c8', ARRAY['53b6dcae-9565-4397-94b3-96bc4420c3cc','04c5363c-5b01-4a11-907d-a57540551134']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], 'On-call rotation monitors production health and resolves live issues');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 5: IT Infrastructure Management
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'IT Infrastructure Management',
  'process',
  NULL,
  'Covers server, network, and cloud infrastructure provisioning, monitoring, capacity planning, and decommissioning activities.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0005-000000000001', 'a0000000-0000-0000-0001-000000000005', 'Provision Server and Cloud Resources', ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f','a1096387-7d43-4302-b6c3-df110e3d9e34']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['6be192d9-d89f-4b72-a1e9-d908657f62fb','20e9695a-5412-4bc1-b838-868df2471e27']::uuid[], ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2']::uuid[], 'Infrastructure team provisions VMs, containers, and cloud services per approved requests'),
  ('b0000000-0000-0000-0005-000000000002', 'a0000000-0000-0000-0001-000000000005', 'Monitor Infrastructure Health', ARRAY['6be192d9-d89f-4b72-a1e9-d908657f62fb','20e9695a-5412-4bc1-b838-868df2471e27']::uuid[], 'c60527eb-2d3f-4674-91a5-f7da13f1f81f', ARRAY['a1096387-7d43-4302-b6c3-df110e3d9e34']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], '24/7 monitoring of uptime, CPU, memory, disk, and network metrics via Zabbix/Grafana'),
  ('b0000000-0000-0000-0005-000000000003', 'a0000000-0000-0000-0001-000000000005', 'Perform Capacity Planning', ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['a1096387-7d43-4302-b6c3-df110e3d9e34','6be192d9-d89f-4b72-a1e9-d908657f62fb','20e9695a-5412-4bc1-b838-868df2471e27']::uuid[], ARRAY['f782c2e1-6050-4ce0-a609-224e484328d2','f0896cd0-10a3-4eb6-8727-fbc2913a26d8']::uuid[], 'Quarterly capacity reviews to ensure resources meet projected demand'),
  ('b0000000-0000-0000-0005-000000000004', 'a0000000-0000-0000-0001-000000000005', 'Apply Security Patches and Updates', ARRAY['a1096387-7d43-4302-b6c3-df110e3d9e34','6be192d9-d89f-4b72-a1e9-d908657f62fb']::uuid[], 'c60527eb-2d3f-4674-91a5-f7da13f1f81f', ARRAY['20e9695a-5412-4bc1-b838-868df2471e27','1ee2c7e4-2bf0-435e-ac02-1969e924011f']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','f782c2e1-6050-4ce0-a609-224e484328d2']::uuid[], 'Critical patches within 48 hours, routine patches during maintenance windows'),
  ('b0000000-0000-0000-0005-000000000005', 'a0000000-0000-0000-0001-000000000005', 'Decommission End-of-Life Assets', ARRAY['20e9695a-5412-4bc1-b838-868df2471e27']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f','a1096387-7d43-4302-b6c3-df110e3d9e34']::uuid[], ARRAY['6be192d9-d89f-4b72-a1e9-d908657f62fb','f782c2e1-6050-4ce0-a609-224e484328d2']::uuid[], 'Securely wipe data and dispose of or recycle hardware assets');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 6: Data Backup and Recovery
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Data Backup and Disaster Recovery',
  'process',
  NULL,
  'Defines responsibilities for data backup scheduling, execution, verification, and disaster recovery testing to ensure business continuity and data integrity.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0006-000000000001', 'a0000000-0000-0000-0001-000000000006', 'Configure Backup Schedules', ARRAY['f0896cd0-10a3-4eb6-8727-fbc2913a26d8','4efad8ea-2252-4dbf-be05-14c173a1a2ea']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['fb98959e-7b93-47ee-b669-0b3f16bb96b7','c60527eb-2d3f-4674-91a5-f7da13f1f81f']::uuid[], ARRAY['09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b']::uuid[], 'Define RPO/RTO requirements and configure backup jobs accordingly'),
  ('b0000000-0000-0000-0006-000000000002', 'a0000000-0000-0000-0001-000000000006', 'Execute Daily Backup Operations', ARRAY['4efad8ea-2252-4dbf-be05-14c173a1a2ea']::uuid[], 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', ARRAY['fb98959e-7b93-47ee-b669-0b3f16bb96b7']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], 'Automated backups run nightly; operator verifies completion each morning'),
  ('b0000000-0000-0000-0006-000000000003', 'a0000000-0000-0000-0001-000000000006', 'Validate Backup Integrity', ARRAY['fb98959e-7b93-47ee-b669-0b3f16bb96b7','4efad8ea-2252-4dbf-be05-14c173a1a2ea']::uuid[], 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b']::uuid[], 'Weekly restore tests to verify backup recoverability'),
  ('b0000000-0000-0000-0006-000000000004', 'a0000000-0000-0000-0001-000000000006', 'Execute Disaster Recovery Drill', ARRAY['f0896cd0-10a3-4eb6-8727-fbc2913a26d8','4efad8ea-2252-4dbf-be05-14c173a1a2ea','fb98959e-7b93-47ee-b669-0b3f16bb96b7']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f','a1096387-7d43-4302-b6c3-df110e3d9e34']::uuid[], ARRAY['09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b','cb3fdfc6-17d0-451d-9cff-3884df293575','7c8d2bc7-44d5-4f2f-8f21-247cff4a361e']::uuid[], 'Quarterly DR drill simulating site failover and data restoration'),
  ('b0000000-0000-0000-0006-000000000005', 'a0000000-0000-0000-0001-000000000006', 'Manage Offsite Storage and Replication', ARRAY['4efad8ea-2252-4dbf-be05-14c173a1a2ea']::uuid[], 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], ARRAY['fb98959e-7b93-47ee-b669-0b3f16bb96b7','c60527eb-2d3f-4674-91a5-f7da13f1f81f']::uuid[], 'Ensure offsite replicas are synchronized and accessible for DR scenarios');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 7: IT Vendor Management
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'IT Vendor and Contract Management',
  'process',
  NULL,
  'Covers vendor selection, contract negotiation, performance monitoring, and relationship management for all IT service providers and technology vendors.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0007-000000000001', 'a0000000-0000-0000-0001-000000000007', 'Evaluate and Select Vendors', ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575','7c8d2bc7-44d5-4f2f-8f21-247cff4a361e']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8','961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], ARRAY['9bef795c-2ada-4b34-9d2f-15a318c7b496']::uuid[], 'RFP process with scoring matrix for technical capability, cost, and references'),
  ('b0000000-0000-0000-0007-000000000002', 'a0000000-0000-0000-0001-000000000007', 'Negotiate Contract Terms', ARRAY['71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575','7c8d2bc7-44d5-4f2f-8f21-247cff4a361e']::uuid[], ARRAY['961b78e7-776e-4fcd-a728-eb9d1ebe4c12','9bef795c-2ada-4b34-9d2f-15a318c7b496']::uuid[], 'Legal and procurement review of SLAs, licensing, liability, and payment terms'),
  ('b0000000-0000-0000-0007-000000000003', 'a0000000-0000-0000-0001-000000000007', 'Onboard New Vendor', ARRAY['961b78e7-776e-4fcd-a728-eb9d1ebe4c12','9bef795c-2ada-4b34-9d2f-15a318c7b496']::uuid[], 'cb3fdfc6-17d0-451d-9cff-3884df293575', ARRAY['7c8d2bc7-44d5-4f2f-8f21-247cff4a361e','1ee2c7e4-2bf0-435e-ac02-1969e924011f']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8']::uuid[], 'Security assessment, NDA, access provisioning, and introductory kickoff'),
  ('b0000000-0000-0000-0007-000000000004', 'a0000000-0000-0000-0001-000000000007', 'Monitor Vendor Performance', ARRAY['7c8d2bc7-44d5-4f2f-8f21-247cff4a361e']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575','961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], ARRAY['71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8','9bef795c-2ada-4b34-9d2f-15a318c7b496']::uuid[], 'Monthly KPI reviews and quarterly business reviews with vendors'),
  ('b0000000-0000-0000-0007-000000000005', 'a0000000-0000-0000-0001-000000000007', 'Manage Contract Renewals and Terminations', ARRAY['cb3fdfc6-17d0-451d-9cff-3884df293575']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8','7c8d2bc7-44d5-4f2f-8f21-247cff4a361e','961b78e7-776e-4fcd-a728-eb9d1ebe4c12']::uuid[], ARRAY['9bef795c-2ada-4b34-9d2f-15a318c7b496','175a82ee-5aa2-459f-9fb0-63a00d1ae21d']::uuid[], 'Track renewal dates 90 days ahead; initiate re-evaluation or transition planning');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 8: IT Budget and Procurement
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'IT Budget Planning and Procurement',
  'process',
  NULL,
  'Defines RACI for the annual IT budget cycle, procurement of hardware/software, purchase order management, and expenditure tracking.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0008-000000000001', 'a0000000-0000-0000-0001-000000000008', 'Develop Annual IT Budget', ARRAY['175a82ee-5aa2-459f-9fb0-63a00d1ae21d','09aeba21-90d8-4cad-bb88-320dd35b7db5']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','c60527eb-2d3f-4674-91a5-f7da13f1f81f','41300057-cefe-4eb3-ba63-f6cf004786c8']::uuid[], ARRAY['4038facc-92fa-46af-8398-40de62b68c4e','9989e917-eb2a-43d9-b410-00b3b00c658d']::uuid[], 'Consolidate budget requests from all divisions by Q3 each year'),
  ('b0000000-0000-0000-0008-000000000002', 'a0000000-0000-0000-0001-000000000008', 'Approve Capital Expenditure', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['175a82ee-5aa2-459f-9fb0-63a00d1ae21d','09aeba21-90d8-4cad-bb88-320dd35b7db5']::uuid[], ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','4038facc-92fa-46af-8398-40de62b68c4e']::uuid[], 'CapEx above threshold requires director and finance committee approval'),
  ('b0000000-0000-0000-0008-000000000003', 'a0000000-0000-0000-0001-000000000008', 'Process Purchase Orders', ARRAY['09aeba21-90d8-4cad-bb88-320dd35b7db5']::uuid[], '175a82ee-5aa2-459f-9fb0-63a00d1ae21d', ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','4038facc-92fa-46af-8398-40de62b68c4e']::uuid[], 'Create POs, coordinate with finance, and track vendor delivery'),
  ('b0000000-0000-0000-0008-000000000004', 'a0000000-0000-0000-0001-000000000008', 'Track Budget Utilization', ARRAY['175a82ee-5aa2-459f-9fb0-63a00d1ae21d']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['09aeba21-90d8-4cad-bb88-320dd35b7db5','5064c947-bb1c-45e3-868b-65d4c987d998']::uuid[], ARRAY['4038facc-92fa-46af-8398-40de62b68c4e','9989e917-eb2a-43d9-b410-00b3b00c658d','b2c4a01b-6771-4ccf-99e0-9b402e54f141']::uuid[], 'Monthly spend vs. budget reporting with variance analysis'),
  ('b0000000-0000-0000-0008-000000000005', 'a0000000-0000-0000-0001-000000000008', 'Receive and Inspect Deliveries', ARRAY['5064c947-bb1c-45e3-868b-65d4c987d998','9989e917-eb2a-43d9-b410-00b3b00c658d']::uuid[], '09aeba21-90d8-4cad-bb88-320dd35b7db5', ARRAY['175a82ee-5aa2-459f-9fb0-63a00d1ae21d']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001','4038facc-92fa-46af-8398-40de62b68c4e']::uuid[], 'Verify received items against PO specifications; report discrepancies');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 9: Business Continuity Planning
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'Business Continuity Planning',
  'process',
  NULL,
  'Covers business impact analysis, continuity plan development, testing, and maintenance to ensure critical IT services remain available during disruptions.',
  'draft',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0009-000000000001', 'a0000000-0000-0000-0001-000000000009', 'Conduct Business Impact Analysis', ARRAY['b2c4a01b-6771-4ccf-99e0-9b402e54f141','f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['2fe19db4-d46e-4d94-aa47-115fd59fb3cd','c60527eb-2d3f-4674-91a5-f7da13f1f81f','41300057-cefe-4eb3-ba63-f6cf004786c8']::uuid[], ARRAY['1ee2c7e4-2bf0-435e-ac02-1969e924011f']::uuid[], 'Identify critical processes, dependencies, and acceptable downtime thresholds'),
  ('b0000000-0000-0000-0009-000000000002', 'a0000000-0000-0000-0001-000000000009', 'Develop BCP Documentation', ARRAY['f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49']::uuid[], 'b2c4a01b-6771-4ccf-99e0-9b402e54f141', ARRAY['2fe19db4-d46e-4d94-aa47-115fd59fb3cd','20000000-0000-0000-0000-000000000001']::uuid[], ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f','41300057-cefe-4eb3-ba63-f6cf004786c8']::uuid[], 'Create recovery procedures, communication plans, and escalation paths'),
  ('b0000000-0000-0000-0009-000000000003', 'a0000000-0000-0000-0001-000000000009', 'Conduct BCP Tabletop Exercise', ARRAY['b2c4a01b-6771-4ccf-99e0-9b402e54f141','f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49','2fe19db4-d46e-4d94-aa47-115fd59fb3cd']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['c60527eb-2d3f-4674-91a5-f7da13f1f81f','a1096387-7d43-4302-b6c3-df110e3d9e34','1ee2c7e4-2bf0-435e-ac02-1969e924011f']::uuid[], ARRAY['41300057-cefe-4eb3-ba63-f6cf004786c8','f782c2e1-6050-4ce0-a609-224e484328d2','f0896cd0-10a3-4eb6-8727-fbc2913a26d8']::uuid[], 'Semi-annual scenario-based exercise with all key stakeholders'),
  ('b0000000-0000-0000-0009-000000000004', 'a0000000-0000-0000-0001-000000000009', 'Maintain Emergency Contact Lists', ARRAY['2fe19db4-d46e-4d94-aa47-115fd59fb3cd']::uuid[], 'b2c4a01b-6771-4ccf-99e0-9b402e54f141', ARRAY['f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], 'Quarterly update of emergency contacts, vendor escalation paths, and call trees'),
  ('b0000000-0000-0000-0009-000000000005', 'a0000000-0000-0000-0001-000000000009', 'Review and Update BCP Annually', ARRAY['f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49','b2c4a01b-6771-4ccf-99e0-9b402e54f141']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['2fe19db4-d46e-4d94-aa47-115fd59fb3cd','c60527eb-2d3f-4674-91a5-f7da13f1f81f','a1096387-7d43-4302-b6c3-df110e3d9e34','1ee2c7e4-2bf0-435e-ac02-1969e924011f']::uuid[], ARRAY['41300057-cefe-4eb3-ba63-f6cf004786c8','f782c2e1-6050-4ce0-a609-224e484328d2']::uuid[], 'Annual review cycle incorporating lessons learned and organizational changes');

-- ══════════════════════════════════════════════════════════════
-- RACI Matrix 10: IT Asset Lifecycle Management
-- ══════════════════════════════════════════════════════════════
INSERT INTO raci_matrices (id, tenant_id, title, entity_type, entity_id, description, status, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'IT Asset Lifecycle Management',
  'process',
  NULL,
  'Manages the complete lifecycle of IT assets from procurement through deployment, maintenance, and disposal, including software license compliance.',
  'active',
  '20000000-0000-0000-0000-000000000001'
);

INSERT INTO raci_entries (id, matrix_id, activity, responsible_ids, accountable_id, consulted_ids, informed_ids, notes) VALUES
  ('b0000000-0000-0000-0010-000000000001', 'a0000000-0000-0000-0001-000000000010', 'Register New Assets in CMDB', ARRAY['e23bb508-44bb-4ea4-b75a-e4114b526ce8','b3c458fc-071f-437c-962a-0d1a81b09cfc']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['818035e0-689b-4f0c-8e0c-803123349836']::uuid[], ARRAY['c1e9cd35-053b-44cf-b5f9-c0c439fa01d6','e1fb9fed-bc64-4cff-87ea-defe8c09eae8']::uuid[], 'All assets registered within 24 hours of receipt with serial number, location, and owner'),
  ('b0000000-0000-0000-0010-000000000002', 'a0000000-0000-0000-0001-000000000010', 'Assign Assets to Users', ARRAY['b3c458fc-071f-437c-962a-0d1a81b09cfc']::uuid[], 'e23bb508-44bb-4ea4-b75a-e4114b526ce8', ARRAY['818035e0-689b-4f0c-8e0c-803123349836','c1e9cd35-053b-44cf-b5f9-c0c439fa01d6']::uuid[], ARRAY['20000000-0000-0000-0000-000000000001']::uuid[], 'Issue assets with signed acceptance form and configure per user profile'),
  ('b0000000-0000-0000-0010-000000000003', 'a0000000-0000-0000-0001-000000000010', 'Conduct Periodic Asset Audit', ARRAY['818035e0-689b-4f0c-8e0c-803123349836','c1e9cd35-053b-44cf-b5f9-c0c439fa01d6']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['e23bb508-44bb-4ea4-b75a-e4114b526ce8','b3c458fc-071f-437c-962a-0d1a81b09cfc']::uuid[], ARRAY['e1fb9fed-bc64-4cff-87ea-defe8c09eae8','41300057-cefe-4eb3-ba63-f6cf004786c8']::uuid[], 'Bi-annual physical verification of assets against CMDB records'),
  ('b0000000-0000-0000-0010-000000000004', 'a0000000-0000-0000-0001-000000000010', 'Manage Software License Compliance', ARRAY['e1fb9fed-bc64-4cff-87ea-defe8c09eae8']::uuid[], '20000000-0000-0000-0000-000000000001', ARRAY['e23bb508-44bb-4ea4-b75a-e4114b526ce8','41300057-cefe-4eb3-ba63-f6cf004786c8']::uuid[], ARRAY['b3c458fc-071f-437c-962a-0d1a81b09cfc','818035e0-689b-4f0c-8e0c-803123349836','c1e9cd35-053b-44cf-b5f9-c0c439fa01d6']::uuid[], 'Track license usage vs. entitlements; flag over-deployment risks'),
  ('b0000000-0000-0000-0010-000000000005', 'a0000000-0000-0000-0001-000000000010', 'Dispose of Retired Assets', ARRAY['c1e9cd35-053b-44cf-b5f9-c0c439fa01d6','818035e0-689b-4f0c-8e0c-803123349836']::uuid[], 'e23bb508-44bb-4ea4-b75a-e4114b526ce8', ARRAY['20000000-0000-0000-0000-000000000001','1ee2c7e4-2bf0-435e-ac02-1969e924011f']::uuid[], ARRAY['b3c458fc-071f-437c-962a-0d1a81b09cfc','e1fb9fed-bc64-4cff-87ea-defe8c09eae8']::uuid[], 'Certified data destruction, environmental disposal, and CMDB record update');

-- +goose Down
DELETE FROM raci_entries WHERE matrix_id IN (
  'a0000000-0000-0000-0001-000000000001',
  'a0000000-0000-0000-0001-000000000002',
  'a0000000-0000-0000-0001-000000000003',
  'a0000000-0000-0000-0001-000000000004',
  'a0000000-0000-0000-0001-000000000005',
  'a0000000-0000-0000-0001-000000000006',
  'a0000000-0000-0000-0001-000000000007',
  'a0000000-0000-0000-0001-000000000008',
  'a0000000-0000-0000-0001-000000000009',
  'a0000000-0000-0000-0001-000000000010'
);
DELETE FROM raci_matrices WHERE id IN (
  'a0000000-0000-0000-0001-000000000001',
  'a0000000-0000-0000-0001-000000000002',
  'a0000000-0000-0000-0001-000000000003',
  'a0000000-0000-0000-0001-000000000004',
  'a0000000-0000-0000-0001-000000000005',
  'a0000000-0000-0000-0001-000000000006',
  'a0000000-0000-0000-0001-000000000007',
  'a0000000-0000-0000-0001-000000000008',
  'a0000000-0000-0000-0001-000000000009',
  'a0000000-0000-0000-0001-000000000010'
);

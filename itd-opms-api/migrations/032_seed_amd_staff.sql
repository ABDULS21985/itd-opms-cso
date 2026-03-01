-- +goose Up
-- Migration 031: Seed AMD Division staff from operational roster
-- Seeds: 37 AMD staff members with 'staff' role bindings

-- ══════════════════════════════════════════════
-- Users: 37 AMD Staff Members
-- ══════════════════════════════════════════════

INSERT INTO users (id, email, display_name, job_title, department, office, tenant_id, is_active, password_hash) VALUES
  ('f782c2e1-6050-4ce0-a609-224e484328d2', 'sabdul@cbn.gov.ng', 'Shadrach Abdul', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('f0896cd0-10a3-4eb6-8727-fbc2913a26d8', 'asabubakar3@cbn.gov.ng', 'Abba Sulaiman Abubakar', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('4efad8ea-2252-4dbf-be05-14c173a1a2ea', 'naabubakar@cbn.gov.ng', 'Nafisah Abdu Abubakar', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('fb98959e-7b93-47ee-b669-0b3f16bb96b7', 'tsadegoke@cbn.gov.ng', 'Tosin Samuel Adegoke', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', 'oeadeoye@cbn.gov.ng', 'Olatayo Emmanuel Adeoye', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('cb3fdfc6-17d0-451d-9cff-3884df293575', 'fahmed@cbn.gov.ng', 'Fatima Gachi Ahmed', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('7c8d2bc7-44d5-4f2f-8f21-247cff4a361e', 'baajewole@cbn.gov.ng', 'Babatope Adebisi Ajewole', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8', 'ajajileye@cbn.gov.ng', 'Ayokunle Joseph Ajileye', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('961b78e7-776e-4fcd-a728-eb9d1ebe4c12', 'aaliyu5@cbn.gov.ng', 'Abdulhamid Aliyu', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('9bef795c-2ada-4b34-9d2f-15a318c7b496', 'maliyu7@cbn.gov.ng', 'Muhammad Aminu Aliyu', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('175a82ee-5aa2-459f-9fb0-63a00d1ae21d', 'obaluko@cbn.gov.ng', 'Olumide Babafemi Aluko', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('09aeba21-90d8-4cad-bb88-320dd35b7db5', 'vnawoke@cbn.gov.ng', 'Victor Ndubuisi Awoke', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('5064c947-bb1c-45e3-868b-65d4c987d998', 'ambashir@cbn.gov.ng', 'Aliyu Mohammed Bashir', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('4038facc-92fa-46af-8398-40de62b68c4e', 'jobrown-asakpa@cbn.gov.ng', 'John Oghenekevbe Brown-Asakpa', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('9989e917-eb2a-43d9-b410-00b3b00c658d', 'aschobe@cbn.gov.ng', 'Abduljalil Sani Chobe', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('b2c4a01b-6771-4ccf-99e0-9b402e54f141', 'badangiwa@cbn.gov.ng', 'Bello Ahmed Dangiwa', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', 'aifaturoti@cbn.gov.ng', 'Abiola Ibukun Faturoti', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('2fe19db4-d46e-4d94-aa47-115fd59fb3cd', 'atgarba@cbn.gov.ng', 'Abubakar Tukur Garba', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('1ee2c7e4-2bf0-435e-ac02-1969e924011f', 'sohassan@cbn.gov.ng', 'Sulaiman Olalekan Hassan', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('11312f3e-be19-4ea6-bfb9-593d126f3558', 'maibrahim4@cbn.gov.ng', 'Mubarak Abdullahi Ibrahim', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('7600e3bf-ab4e-4040-b44a-0056665ec663', 'yisah3@cbn.gov.ng', 'Yahaya Isah', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('5753c598-9e2f-4dcb-bdd8-710104484cd2', 'oejunaid@cbn.gov.ng', 'Oloruntobi Emmanuel Junaid', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('e23bb508-44bb-4ea4-b75a-e4114b526ce8', 'amuhammad10@cbn.gov.ng', 'Abdulrahman Muhammad', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('b3c458fc-071f-437c-962a-0d1a81b09cfc', 'jmuhammad3@cbn.gov.ng', 'Jibrin Muhammad', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('818035e0-689b-4f0c-8e0c-803123349836', 'rmuhammad@cbn.gov.ng', 'Ruqayya Muhammad', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('c1e9cd35-053b-44cf-b5f9-c0c439fa01d6', 'amuritala4@cbn.gov.ng', 'Aliyu Tunde Muritala', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('e1fb9fed-bc64-4cff-87ea-defe8c09eae8', 'janasir@cbn.gov.ng', 'Jaafar A. Nasir', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('41300057-cefe-4eb3-ba63-f6cf004786c8', 'ucokereke@cbn.gov.ng', 'Ugochukwu Chikezie Okereke', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('44011aaf-f649-41e9-9d6e-16911e54fb0b', 'saolugbenro@cbn.gov.ng', 'Samuel Adedotun Olugbenro', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('53b6dcae-9565-4397-94b3-96bc4420c3cc', 'aoomolaja@cbn.gov.ng', 'Adebola Olaniyi Omolaja', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('fbbfe490-fc9a-4be0-b371-e4cf26fd776a', 'cfoyebode@cbn.gov.ng', 'Clement Fisayo Oyebode', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('04c5363c-5b01-4a11-907d-a57540551134', 'arenner@cbn.gov.ng', 'Adekunle Renner', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('a9d1cb7b-d8d7-45c0-af3f-ef7dcc6d58fe', 'iashehu2@cbn.gov.ng', 'Ibrahim Adamu Shehu', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('c60527eb-2d3f-4674-91a5-f7da13f1f81f', 'kcugwoke@cbn.gov.ng', 'Kenneth Christopher Ugwoke', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('a1096387-7d43-4302-b6c3-df110e3d9e34', 'amuwais@cbn.gov.ng', 'Aiman Muhammad Uwais', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('6be192d9-d89f-4b72-a1e9-d908657f62fb', 'dayakubu@cbn.gov.ng', 'Dauda Ademola Yakubu', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('20e9695a-5412-4bc1-b838-868df2471e27', 'izakariyau@cbn.gov.ng', 'Ibrahim Zakariyau', 'Staff', 'AMD', NULL, '00000000-0000-0000-0000-000000000001', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

-- ══════════════════════════════════════════════
-- Role Bindings: Assign 'staff' role at AMD division scope
-- Role ID '10000000-0000-0000-0000-000000000005' = staff
-- Division ID 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787' = AMD
-- Granted by division head 'b57c7521-672f-307c-9878-e3504b0e18d7'
-- ══════════════════════════════════════════════

INSERT INTO role_bindings (user_id, role_id, tenant_id, scope_type, scope_id, granted_by, is_active) VALUES
  ('f782c2e1-6050-4ce0-a609-224e484328d2', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('f0896cd0-10a3-4eb6-8727-fbc2913a26d8', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('4efad8ea-2252-4dbf-be05-14c173a1a2ea', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('fb98959e-7b93-47ee-b669-0b3f16bb96b7', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('cb3fdfc6-17d0-451d-9cff-3884df293575', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('7c8d2bc7-44d5-4f2f-8f21-247cff4a361e', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('9bef795c-2ada-4b34-9d2f-15a318c7b496', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('175a82ee-5aa2-459f-9fb0-63a00d1ae21d', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('09aeba21-90d8-4cad-bb88-320dd35b7db5', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('5064c947-bb1c-45e3-868b-65d4c987d998', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('4038facc-92fa-46af-8398-40de62b68c4e', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('9989e917-eb2a-43d9-b410-00b3b00c658d', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('b2c4a01b-6771-4ccf-99e0-9b402e54f141', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('2fe19db4-d46e-4d94-aa47-115fd59fb3cd', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('1ee2c7e4-2bf0-435e-ac02-1969e924011f', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('11312f3e-be19-4ea6-bfb9-593d126f3558', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('7600e3bf-ab4e-4040-b44a-0056665ec663', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('5753c598-9e2f-4dcb-bdd8-710104484cd2', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('e23bb508-44bb-4ea4-b75a-e4114b526ce8', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('b3c458fc-071f-437c-962a-0d1a81b09cfc', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('818035e0-689b-4f0c-8e0c-803123349836', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('c1e9cd35-053b-44cf-b5f9-c0c439fa01d6', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('e1fb9fed-bc64-4cff-87ea-defe8c09eae8', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('41300057-cefe-4eb3-ba63-f6cf004786c8', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('44011aaf-f649-41e9-9d6e-16911e54fb0b', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('53b6dcae-9565-4397-94b3-96bc4420c3cc', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('fbbfe490-fc9a-4be0-b371-e4cf26fd776a', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('04c5363c-5b01-4a11-907d-a57540551134', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('a9d1cb7b-d8d7-45c0-af3f-ef7dcc6d58fe', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('c60527eb-2d3f-4674-91a5-f7da13f1f81f', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('a1096387-7d43-4302-b6c3-df110e3d9e34', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('6be192d9-d89f-4b72-a1e9-d908657f62fb', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true),
  ('20e9695a-5412-4bc1-b838-868df2471e27', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'division', 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787', 'b57c7521-672f-307c-9878-e3504b0e18d7', true);

-- +goose Down
DELETE FROM role_bindings WHERE user_id IN (
  'f782c2e1-6050-4ce0-a609-224e484328d2', 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8',
  '4efad8ea-2252-4dbf-be05-14c173a1a2ea', 'fb98959e-7b93-47ee-b669-0b3f16bb96b7',
  '09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', 'cb3fdfc6-17d0-451d-9cff-3884df293575',
  '7c8d2bc7-44d5-4f2f-8f21-247cff4a361e', '71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8',
  '961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '9bef795c-2ada-4b34-9d2f-15a318c7b496',
  '175a82ee-5aa2-459f-9fb0-63a00d1ae21d', '09aeba21-90d8-4cad-bb88-320dd35b7db5',
  '5064c947-bb1c-45e3-868b-65d4c987d998', '4038facc-92fa-46af-8398-40de62b68c4e',
  '9989e917-eb2a-43d9-b410-00b3b00c658d', 'b2c4a01b-6771-4ccf-99e0-9b402e54f141',
  'f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', '2fe19db4-d46e-4d94-aa47-115fd59fb3cd',
  '1ee2c7e4-2bf0-435e-ac02-1969e924011f', '11312f3e-be19-4ea6-bfb9-593d126f3558',
  '7600e3bf-ab4e-4040-b44a-0056665ec663', '5753c598-9e2f-4dcb-bdd8-710104484cd2',
  'e23bb508-44bb-4ea4-b75a-e4114b526ce8', 'b3c458fc-071f-437c-962a-0d1a81b09cfc',
  '818035e0-689b-4f0c-8e0c-803123349836', 'c1e9cd35-053b-44cf-b5f9-c0c439fa01d6',
  'e1fb9fed-bc64-4cff-87ea-defe8c09eae8', '41300057-cefe-4eb3-ba63-f6cf004786c8',
  '44011aaf-f649-41e9-9d6e-16911e54fb0b', '53b6dcae-9565-4397-94b3-96bc4420c3cc',
  'fbbfe490-fc9a-4be0-b371-e4cf26fd776a', '04c5363c-5b01-4a11-907d-a57540551134',
  'a9d1cb7b-d8d7-45c0-af3f-ef7dcc6d58fe', 'c60527eb-2d3f-4674-91a5-f7da13f1f81f',
  'a1096387-7d43-4302-b6c3-df110e3d9e34', '6be192d9-d89f-4b72-a1e9-d908657f62fb',
  '20e9695a-5412-4bc1-b838-868df2471e27'
);

DELETE FROM users WHERE id IN (
  'f782c2e1-6050-4ce0-a609-224e484328d2', 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8',
  '4efad8ea-2252-4dbf-be05-14c173a1a2ea', 'fb98959e-7b93-47ee-b669-0b3f16bb96b7',
  '09fc8e73-8078-40ed-a2ad-5ec4f4c0bc8b', 'cb3fdfc6-17d0-451d-9cff-3884df293575',
  '7c8d2bc7-44d5-4f2f-8f21-247cff4a361e', '71f5b682-d334-4e0a-a72a-c0cbfbb7fbe8',
  '961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '9bef795c-2ada-4b34-9d2f-15a318c7b496',
  '175a82ee-5aa2-459f-9fb0-63a00d1ae21d', '09aeba21-90d8-4cad-bb88-320dd35b7db5',
  '5064c947-bb1c-45e3-868b-65d4c987d998', '4038facc-92fa-46af-8398-40de62b68c4e',
  '9989e917-eb2a-43d9-b410-00b3b00c658d', 'b2c4a01b-6771-4ccf-99e0-9b402e54f141',
  'f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', '2fe19db4-d46e-4d94-aa47-115fd59fb3cd',
  '1ee2c7e4-2bf0-435e-ac02-1969e924011f', '11312f3e-be19-4ea6-bfb9-593d126f3558',
  '7600e3bf-ab4e-4040-b44a-0056665ec663', '5753c598-9e2f-4dcb-bdd8-710104484cd2',
  'e23bb508-44bb-4ea4-b75a-e4114b526ce8', 'b3c458fc-071f-437c-962a-0d1a81b09cfc',
  '818035e0-689b-4f0c-8e0c-803123349836', 'c1e9cd35-053b-44cf-b5f9-c0c439fa01d6',
  'e1fb9fed-bc64-4cff-87ea-defe8c09eae8', '41300057-cefe-4eb3-ba63-f6cf004786c8',
  '44011aaf-f649-41e9-9d6e-16911e54fb0b', '53b6dcae-9565-4397-94b3-96bc4420c3cc',
  'fbbfe490-fc9a-4be0-b371-e4cf26fd776a', '04c5363c-5b01-4a11-907d-a57540551134',
  'a9d1cb7b-d8d7-45c0-af3f-ef7dcc6d58fe', 'c60527eb-2d3f-4674-91a5-f7da13f1f81f',
  'a1096387-7d43-4302-b6c3-df110e3d9e34', '6be192d9-d89f-4b72-a1e9-d908657f62fb',
  '20e9695a-5412-4bc1-b838-868df2471e27'
);

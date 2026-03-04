-- +goose Up
-- Migration 038: Seed user OLANIYAN, RASHEED ALABA with global_admin role
-- Deputy Director (Comp), Information Technology Department

-- ══════════════════════════════════════════════
-- User: Olaniyan, Rasheed Alaba
-- ══════════════════════════════════════════════

INSERT INTO users (id, email, display_name, job_title, department, office, phone, tenant_id, is_active, password_hash, metadata)
VALUES (
  gen_random_uuid(),
  'raolaniyan@cbn.gov.ng',
  'Olaniyan, Rasheed Alaba',
  'Deputy Director (Comp), ITech',
  'Information Technology',
  'Application Management Division',
  '+2348129021084',
  '00000000-0000-0000-0000-000000000001',
  true,
  '$2a$10$QzDvHdpCvQOZf.ML5TRoteyA5rZpTw4XwxfIqOIkQSd0KGGHx48r2',
  '{"work_phone": "15173", "business_address": "Abuja"}'::jsonb
);

-- ══════════════════════════════════════════════
-- Role Binding: global_admin
-- ══════════════════════════════════════════════

INSERT INTO role_bindings (id, user_id, role_id, tenant_id, scope_type, granted_by, granted_at, is_active)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'raolaniyan@cbn.gov.ng'),
  '10000000-0000-0000-0000-000000000001',  -- global_admin role
  '00000000-0000-0000-0000-000000000001',  -- default tenant
  'global',
  (SELECT id FROM users WHERE email = 'admin@itd.cbn.gov.ng'),  -- granted by system admin
  NOW(),
  true
);

-- +goose Down
DELETE FROM role_bindings WHERE user_id = (SELECT id FROM users WHERE email = 'raolaniyan@cbn.gov.ng');
DELETE FROM users WHERE email = 'raolaniyan@cbn.gov.ng';

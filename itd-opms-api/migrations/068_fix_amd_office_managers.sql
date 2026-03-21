-- +goose Up
-- Migration 068: Restore AMD office managers and assign users to correct offices

-- ══════════════════════════════════════════════════════════════
-- 1. Restore manager_user_id on AMD division and offices
-- ══════════════════════════════════════════════════════════════

-- Abubakar Mohammed → Head of AMD division
UPDATE org_units SET manager_user_id = 'b57c7521-672f-307c-9878-e3504b0e18d7'
WHERE id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787';

-- Fatima Ibrahim → Head of Business Intelligence Services (AMD-BISO)
UPDATE org_units SET manager_user_id = 'e712da03-d912-0288-98e7-7907f066d7cd'
WHERE id = '4493b788-602f-e1a7-ab04-3058bbe61ff4';

-- Chukwuemeka Okafor → Head of Collaboration Services (AMD-CSO)
UPDATE org_units SET manager_user_id = '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8'
WHERE id = 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90';

-- Amina Yusuf → Head of Financial Surveillance Services (AMD-FSSO)
UPDATE org_units SET manager_user_id = '90377934-1644-8547-b018-c4bb2449aaef'
WHERE id = 'c22d15fd-f6f0-a86a-d541-f4cd13051094';

-- Oluwaseun Adeyemi → Head of Internal Support Services (AMD-ISSO)
UPDATE org_units SET manager_user_id = 'f3947e51-26fa-f488-4a13-e65c608d2e7b'
WHERE id = '2464f477-fd51-01ff-2cfc-edc0846be881';

-- Musa Abdullahi → Head of Payments & Operations Services (AMD-POSO)
UPDATE org_units SET manager_user_id = 'c59b492e-b071-8565-6194-633cad81d471'
WHERE id = '2a5f2e13-d303-1895-16e1-1b048c9d791d';

-- ══════════════════════════════════════════════════════════════
-- 2. Set org_unit_id for AMD head and office heads
-- ══════════════════════════════════════════════════════════════

-- Division Head → AMD division
UPDATE users SET org_unit_id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'
WHERE id = 'b57c7521-672f-307c-9878-e3504b0e18d7';

-- Office Heads → their respective offices
UPDATE users SET org_unit_id = '4493b788-602f-e1a7-ab04-3058bbe61ff4'
WHERE id = 'e712da03-d912-0288-98e7-7907f066d7cd';

UPDATE users SET org_unit_id = 'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90'
WHERE id = '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8';

UPDATE users SET org_unit_id = 'c22d15fd-f6f0-a86a-d541-f4cd13051094'
WHERE id = '90377934-1644-8547-b018-c4bb2449aaef';

UPDATE users SET org_unit_id = '2464f477-fd51-01ff-2cfc-edc0846be881'
WHERE id = 'f3947e51-26fa-f488-4a13-e65c608d2e7b';

UPDATE users SET org_unit_id = '2a5f2e13-d303-1895-16e1-1b048c9d791d'
WHERE id = 'c59b492e-b071-8565-6194-633cad81d471';

-- ══════════════════════════════════════════════════════════════
-- 3. Assign AMD staff to offices based on their project assignments
--    Staff who manage projects in a specific office → that office
--    Remaining staff stay at AMD division level
-- ══════════════════════════════════════════════════════════════

-- +goose StatementBegin
DO $$
DECLARE
  r RECORD;
BEGIN
  -- For each staff member at AMD division level, check if they manage
  -- a project assigned to a specific AMD office and move them there
  FOR r IN
    SELECT DISTINCT ON (u.id) u.id as user_id, p.division_id as office_id
    FROM users u
    JOIN projects p ON p.project_manager_id = u.id
    JOIN org_units ou ON ou.id = p.division_id
    WHERE u.org_unit_id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'
      AND ou.parent_id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'
      AND ou.level::text = 'office'
    ORDER BY u.id, p.created_at DESC
  LOOP
    UPDATE users SET org_unit_id = r.office_id WHERE id = r.user_id;
  END LOOP;
END $$;
-- +goose StatementEnd


-- +goose Down

-- Revert staff to AMD division
UPDATE users SET org_unit_id = 'ce6d2f59-7c7f-90d2-f0f6-e5560042b787'
WHERE org_unit_id IN (
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90',
  'c22d15fd-f6f0-a86a-d541-f4cd13051094',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  '2a5f2e13-d303-1895-16e1-1b048c9d791d'
) AND id NOT IN (
  'e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
  '90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'c59b492e-b071-8565-6194-633cad81d471'
);

-- Clear org_unit_id on office heads
UPDATE users SET org_unit_id = NULL
WHERE id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
  '90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'c59b492e-b071-8565-6194-633cad81d471'
);

-- Clear managers
UPDATE org_units SET manager_user_id = NULL
WHERE id IN (
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90',
  'c22d15fd-f6f0-a86a-d541-f4cd13051094',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  '2a5f2e13-d303-1895-16e1-1b048c9d791d'
);

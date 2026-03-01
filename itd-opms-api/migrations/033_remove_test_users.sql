-- +goose Up
-- Migration 033: Remove 12 original test/seed users from migration 021
-- Nullify all foreign key references, then delete users

-- Define the list of test user IDs to remove
-- b57c7521 = Abubakar Mohammed (Division Head)
-- e712da03 = Fatima Ibrahim (BISO Head)
-- 7d3f9d2a = Chukwuemeka Okafor (CSO Head)
-- 90377934 = Amina Yusuf (FSSO Head)
-- f3947e51 = Oluwaseun Adeyemi (ISSO Head)
-- c59b492e = Musa Abdullahi (POSO Head)
-- 5db8e9fc = Chidinma Eze, 60fbf979 = Bello Garba
-- 4b7fb185 = Ngozi Obi, 5f1114e9 = Yakubu Sani
-- e5332a5f = Blessing Okoro, 959762a9 = Ibrahim Danladi

-- Nullify org_units.manager_user_id
UPDATE org_units SET manager_user_id = NULL WHERE manager_user_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Nullify projects references
UPDATE projects SET sponsor_id = NULL WHERE sponsor_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

UPDATE projects SET project_manager_id = NULL WHERE project_manager_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Nullify kpis.owner_id
UPDATE kpis SET owner_id = NULL WHERE owner_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Nullify portfolios.owner_id
UPDATE portfolios SET owner_id = NULL WHERE owner_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Nullify work_items references
UPDATE work_items SET assignee_id = NULL WHERE assignee_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

UPDATE work_items SET reporter_id = NULL WHERE reporter_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Delete OKRs owned by test users (owner_id is NOT NULL)
DELETE FROM key_results WHERE okr_id IN (
  SELECT id FROM okrs WHERE owner_id IN (
    'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
    '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
    'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
    '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
    '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
    'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
  )
);
DELETE FROM okrs WHERE owner_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Nullify granted_by in role_bindings
UPDATE role_bindings SET granted_by = NULL WHERE granted_by IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Delete role bindings for these users (ON DELETE CASCADE from users won't help since we need to handle other FKs first)
DELETE FROM role_bindings WHERE user_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Delete refresh tokens
DELETE FROM refresh_tokens WHERE user_id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- Delete the 12 test users
DELETE FROM users WHERE id IN (
  'b57c7521-672f-307c-9878-e3504b0e18d7','e712da03-d912-0288-98e7-7907f066d7cd',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8','90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b','c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33','60fbf979-e97b-ae83-3a87-57727c9b06dc',
  '4b7fb185-6c8d-f83b-9180-5515c64c7245','5f1114e9-d327-5eb1-e390-8225a895a60d',
  'e5332a5f-7fb2-edb6-0691-998591b8dc3e','959762a9-a7c4-c568-6dd3-f781ab060843'
);

-- +goose Down
SELECT 1;

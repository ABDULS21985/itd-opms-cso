-- +goose Up
-- Migration 057: Seed ITSM tickets, comments, CSAT surveys, and SLA breach log
-- Creates: 35 tickets, 20 comments, 8 CSAT surveys, 5 SLA breach entries

-- ══════════════════════════════════════════════════════════════════════
-- Shared IDs
-- ══════════════════════════════════════════════════════════════════════
-- Tenant:   00000000-0000-0000-0000-000000000001
-- Users:
--   b57c7521-672f-307c-9878-e3504b0e18d7  (Division Head)
--   e712da03-d912-0288-98e7-7907f066d7cd
--   5db8e9fc-125b-4883-62c3-372b18e64d33
--   7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8
--   90377934-1644-8547-b018-c4bb2449aaef
--   f3947e51-26fa-f488-4a13-e65c608d2e7b
--   c59b492e-b071-8565-6194-633cad81d471
-- Org Units:
--   ce6d2f59-7c7f-90d2-f0f6-e5560042b787
--   4493b788-602f-e1a7-ab04-3058bbe61ff4
--   db40aa8c-dc75-1e84-8fc9-ef0f59c80a90
--   2464f477-fd51-01ff-2cfc-edc0846be881

-- ══════════════════════════════════════════════════════════════════════
-- TICKETS (35)
-- Distribution:
--   Types:      15 incidents, 10 service_requests, 5 changes, 5 problems
--   Statuses:   6 logged, 4 assigned, 6 in_progress, 3 pending_customer,
--               2 pending_vendor, 6 resolved, 6 closed, 2 cancelled
--   Priorities: 3 P1, 6 P2, 16 P3, 10 P4
--   Major:      2 major incidents
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO tickets (
  id, tenant_id, ticket_number, type, category, subcategory,
  title, description, priority, urgency, impact, status, channel,
  reporter_id, assignee_id, org_unit_id,
  sla_response_target, sla_resolution_target,
  sla_response_met, sla_resolution_met,
  is_major_incident, first_response_at,
  resolution_notes, resolved_at, closed_at,
  tags, created_at, updated_at
) VALUES

-- ── P1 Critical Incidents ───────────────────────────────────────────

-- 1. Major incident - Core Banking System outage (in_progress)
(
  'd0000000-0001-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'INC-000101', 'incident', 'Application', 'Core Banking',
  'Core Banking System unresponsive — all branches affected',
  'The Core Banking Application (Finacle) has become unresponsive since 08:15 WAT. All branches are unable to process transactions. ATM channels are partially affected. The database cluster appears healthy but the application tier is returning 503 errors. Over 2,000 staff impacted.',
  'P1_critical', 'critical', 'critical', 'in_progress', 'portal',
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  NOW() - INTERVAL '4 hours' + INTERVAL '15 minutes',
  NOW() - INTERVAL '4 hours' + INTERVAL '4 hours',
  true, NULL,
  true, NOW() - INTERVAL '4 hours' + INTERVAL '8 minutes',
  NULL, NULL, NULL,
  ARRAY['critical', 'core-banking', 'branch-impact'],
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '1 hour'
),

-- 2. Major incident - Email system down (assigned)
(
  'd0000000-0001-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'INC-000102', 'incident', 'Infrastructure', 'Email',
  'Exchange Online mail flow halted — no inbound/outbound email',
  'All inbound and outbound email has stopped since approximately 09:30 WAT. Microsoft 365 admin center shows service degradation. Hybrid connector appears to be failing authentication. Approximately 1,500 mailboxes affected across all departments.',
  'P1_critical', 'critical', 'critical', 'assigned', 'email',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '2 hours' + INTERVAL '15 minutes',
  NOW() - INTERVAL '2 hours' + INTERVAL '4 hours',
  true, NULL,
  true, NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes',
  NULL, NULL, NULL,
  ARRAY['email', 'microsoft-365', 'major'],
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '30 minutes'
),

-- 3. P1 - Network backbone failure (resolved)
(
  'd0000000-0001-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'INC-000103', 'incident', 'Network', 'Core Network',
  'MPLS backbone link between Head Office and DR site down',
  'The primary MPLS circuit between HO and DR site went down at 06:00 WAT. Failover to secondary link was successful but running at reduced bandwidth (100Mbps vs 1Gbps). ISP has been notified and dispatched a field engineer.',
  'P1_critical', 'critical', 'high', 'resolved', 'manual',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '3 days' + INTERVAL '15 minutes',
  NOW() - INTERVAL '3 days' + INTERVAL '4 hours',
  true, true,
  false, NOW() - INTERVAL '3 days' + INTERVAL '10 minutes',
  'ISP replaced faulty fibre patch panel at Lekki POP. MPLS circuit restored at 14:30 WAT. Full bandwidth confirmed. Monitoring for 24 hours.',
  NOW() - INTERVAL '3 days' + INTERVAL '8 hours',
  NULL,
  ARRAY['network', 'mpls', 'dr-site'],
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days' + INTERVAL '8 hours'
),

-- ── P2 High Incidents ───────────────────────────────────────────────

-- 4. VPN concentrator at capacity (in_progress)
(
  'd0000000-0001-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'INC-000104', 'incident', 'Network', 'VPN',
  'VPN concentrator rejecting new connections — remote staff unable to work',
  'FortiGate VPN concentrator has hit max concurrent sessions (500). Remote workers are unable to connect. Need emergency license upgrade or load balancing across secondary appliance.',
  'P2_high', 'high', 'high', 'in_progress', 'portal',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90',
  NOW() - INTERVAL '6 hours' + INTERVAL '30 minutes',
  NOW() - INTERVAL '6 hours' + INTERVAL '8 hours',
  true, NULL,
  false, NOW() - INTERVAL '6 hours' + INTERVAL '20 minutes',
  NULL, NULL, NULL,
  ARRAY['vpn', 'remote-work', 'capacity'],
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '2 hours'
),

-- 5. Active Directory replication failure (pending_vendor)
(
  'd0000000-0001-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'INC-000105', 'incident', 'Infrastructure', 'Active Directory',
  'AD replication failing between DC01 and DC03 — authentication delays',
  'Domain Controller DC03 has not replicated with DC01 for over 12 hours. Users authenticating against DC03 have stale group policies and password changes are not syncing. Event log shows RPC errors.',
  'P2_high', 'high', 'medium', 'pending_vendor', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '1 day' + INTERVAL '30 minutes',
  NOW() - INTERVAL '1 day' + INTERVAL '8 hours',
  true, NULL,
  false, NOW() - INTERVAL '1 day' + INTERVAL '15 minutes',
  NULL, NULL, NULL,
  ARRAY['active-directory', 'replication', 'authentication'],
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '8 hours'
),

-- 6. Printer fleet offline 2nd floor (resolved)
(
  'd0000000-0001-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'INC-000106', 'incident', 'Hardware', 'Printer',
  'All networked printers on 2nd floor offline after switch replacement',
  'Following the network switch replacement on Floor 2 IDF, all four networked printers (HP LaserJet M609) have gone offline. Print queues are backed up. VLAN tagging may need reconfiguration.',
  'P2_high', 'medium', 'high', 'resolved', 'portal',
  '90377934-1644-8547-b018-c4bb2449aaef',
  'c59b492e-b071-8565-6194-633cad81d471',
  'c22d15fd-f6f0-a86a-d541-f4cd13051094',
  NOW() - INTERVAL '2 days' + INTERVAL '30 minutes',
  NOW() - INTERVAL '2 days' + INTERVAL '8 hours',
  true, true,
  false, NOW() - INTERVAL '2 days' + INTERVAL '25 minutes',
  'VLAN 40 (Printer VLAN) was not configured on replacement switch ports Gi1/0/5-8. Trunked ports reconfigured. All four printers back online and print queues cleared.',
  NOW() - INTERVAL '2 days' + INTERVAL '3 hours',
  NULL,
  ARRAY['printer', 'network', 'floor-2'],
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days' + INTERVAL '3 hours'
),

-- 7. Database performance degradation (in_progress)
(
  'd0000000-0001-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'INC-000107', 'incident', 'Application', 'Database',
  'OPMS database queries timing out — reports failing',
  'PostgreSQL queries on the OPMS reporting database are timing out after the weekend batch load. Slow query log shows full table scans on the audit_events table. Index maintenance may be required.',
  'P2_high', 'high', 'medium', 'in_progress', 'portal',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '5 hours' + INTERVAL '30 minutes',
  NOW() - INTERVAL '5 hours' + INTERVAL '8 hours',
  true, NULL,
  false, NOW() - INTERVAL '5 hours' + INTERVAL '12 minutes',
  NULL, NULL, NULL,
  ARRAY['database', 'performance', 'reporting'],
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '1 hour'
),

-- 8. Backup failure on file server (logged)
(
  'd0000000-0001-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'INC-000108', 'incident', 'Infrastructure', 'Backup',
  'Veeam backup job for file server failed 3 consecutive nights',
  'The nightly Veeam backup job "FS-DAILY-001" for the file server (HPE DL380) has failed for the past 3 nights with error "Insufficient disk space on backup repository". Repository is at 97% capacity.',
  'P2_high', 'high', 'medium', 'logged', 'api',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  NULL,
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '1 hour' + INTERVAL '30 minutes',
  NOW() - INTERVAL '1 hour' + INTERVAL '8 hours',
  NULL, NULL,
  false, NULL,
  NULL, NULL, NULL,
  ARRAY['backup', 'veeam', 'storage'],
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
),

-- 9. WiFi dropping in conference rooms (closed)
(
  'd0000000-0001-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'INC-000109', 'incident', 'Network', 'WiFi',
  'Intermittent WiFi drops in 3rd floor conference rooms during meetings',
  'Staff report WiFi disconnections every 10-15 minutes in Conference Rooms 3A and 3B. Issue started after the AP firmware update last Friday. Affects video calls and screen sharing.',
  'P3_medium', 'medium', 'medium', 'closed', 'portal',
  '90377934-1644-8547-b018-c4bb2449aaef',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'c22d15fd-f6f0-a86a-d541-f4cd13051094',
  NOW() - INTERVAL '5 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '5 days' + INTERVAL '24 hours',
  true, true,
  false, NOW() - INTERVAL '5 days' + INTERVAL '45 minutes',
  'Rolled back Meraki MR46 firmware from v29.5 to v29.3.1 on APs covering Conference Rooms 3A/3B. WiFi stability restored. Meraki support case opened for firmware bug.',
  NOW() - INTERVAL '5 days' + INTERVAL '6 hours',
  NOW() - INTERVAL '4 days',
  ARRAY['wifi', 'conference-room', 'firmware'],
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '4 days'
),

-- ── P3 Medium Incidents ─────────────────────────────────────────────

-- 10. Single user cannot print (logged)
(
  'd0000000-0001-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'INC-000110', 'incident', 'Hardware', 'Printer',
  'Unable to print from laptop to Floor 3 printer — driver error',
  'User reports "Driver is unavailable" error when attempting to print to HP LaserJet on Floor 3. Other users can print normally. Likely needs driver reinstall.',
  'P3_medium', 'medium', 'low', 'logged', 'portal',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
  NULL,
  'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90',
  NOW() - INTERVAL '30 minutes' + INTERVAL '1 hour',
  NOW() - INTERVAL '30 minutes' + INTERVAL '24 hours',
  NULL, NULL,
  false, NULL,
  NULL, NULL, NULL,
  ARRAY['printer', 'driver'],
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
),

-- 11. Outlook freezing (assigned)
(
  'd0000000-0001-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'INC-000111', 'incident', 'Application', 'Email',
  'Outlook desktop client freezing every 15 minutes — needs restart',
  'User in Treasury dept reports Outlook 2021 freezes completely every 15 minutes requiring force-close. OST file may be corrupted. Mailbox size is 8.2GB.',
  'P3_medium', 'medium', 'low', 'assigned', 'portal',
  'c59b492e-b071-8565-6194-633cad81d471',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  '2a5f2e13-d303-1895-16e1-1b048c9d791d',
  NOW() - INTERVAL '3 hours' + INTERVAL '1 hour',
  NOW() - INTERVAL '3 hours' + INTERVAL '24 hours',
  true, NULL,
  false, NOW() - INTERVAL '3 hours' + INTERVAL '40 minutes',
  NULL, NULL, NULL,
  ARRAY['outlook', 'performance', 'desktop'],
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 hours'
),

-- 12. Blue screen on shared workstation (in_progress)
(
  'd0000000-0001-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'INC-000112', 'incident', 'Hardware', 'Desktop',
  'Shared workstation in Reception getting BSOD every morning',
  'Dell OptiPlex in Reception area is crashing with BSOD (WHEA_UNCORRECTABLE_ERROR) every morning when first user logs in. Started after Windows Update last Tuesday. Might be hardware related.',
  'P3_medium', 'medium', 'low', 'in_progress', 'portal',
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  'c59b492e-b071-8565-6194-633cad81d471',
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  NOW() - INTERVAL '2 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '2 days' + INTERVAL '24 hours',
  true, NULL,
  false, NOW() - INTERVAL '2 days' + INTERVAL '50 minutes',
  NULL, NULL, NULL,
  ARRAY['hardware', 'bsod', 'desktop'],
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
),

-- 13. Scanner not recognized (pending_customer)
(
  'd0000000-0001-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000001',
  'INC-000113', 'incident', 'Hardware', 'Peripheral',
  'Document scanner not recognized after laptop replacement',
  'User received a replacement laptop and the Fujitsu ScanSnap iX1600 is no longer detected via USB. Driver was installed but device manager shows unknown device. Awaiting user availability for remote session.',
  'P3_medium', 'low', 'low', 'pending_customer', 'portal',
  '90377934-1644-8547-b018-c4bb2449aaef',
  'c59b492e-b071-8565-6194-633cad81d471',
  'c22d15fd-f6f0-a86a-d541-f4cd13051094',
  NOW() - INTERVAL '4 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '4 days' + INTERVAL '24 hours',
  true, NULL,
  false, NOW() - INTERVAL '4 days' + INTERVAL '30 minutes',
  NULL, NULL, NULL,
  ARRAY['scanner', 'usb', 'driver'],
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '2 days'
),

-- 14. Slow internet in Annex building (resolved)
(
  'd0000000-0001-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'INC-000114', 'incident', 'Network', 'Internet',
  'Internet speed extremely slow in Annex Building — 2Mbps down',
  'Users in the Annex Building report internet speed has dropped to ~2Mbps (normally 100Mbps). Speed tests confirm. Traceroute shows high latency at the first hop. Likely an issue with the uplink from Annex to Head Office.',
  'P3_medium', 'medium', 'medium', 'resolved', 'portal',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90',
  NOW() - INTERVAL '6 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '6 days' + INTERVAL '24 hours',
  true, true,
  false, NOW() - INTERVAL '6 days' + INTERVAL '20 minutes',
  'Faulty SFP module on the Annex uplink port (Gi1/0/1 on C9300). Replaced with spare SFP-10G-SR. Speed restored to 1Gbps. Monitoring.',
  NOW() - INTERVAL '6 days' + INTERVAL '4 hours',
  NULL,
  ARRAY['internet', 'network', 'annex'],
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days' + INTERVAL '4 hours'
),

-- 15. Application error on leave portal (closed)
(
  'd0000000-0001-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000001',
  'INC-000115', 'incident', 'Application', 'HR System',
  'Leave Management Portal showing 500 error on submission',
  'Users are unable to submit leave requests. The portal returns a 500 Internal Server Error after clicking Submit. Approvers also report they cannot see pending requests. Started after yesterdays deployment.',
  'P3_medium', 'medium', 'medium', 'closed', 'portal',
  'c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '2a5f2e13-d303-1895-16e1-1b048c9d791d',
  NOW() - INTERVAL '7 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '7 days' + INTERVAL '24 hours',
  true, true,
  false, NOW() - INTERVAL '7 days' + INTERVAL '35 minutes',
  'Bug in yesterday''s deployment — missing database migration for new leave_type column. Migration applied and application restarted. All functionality restored.',
  NOW() - INTERVAL '7 days' + INTERVAL '2 hours',
  NOW() - INTERVAL '6 days',
  ARRAY['application', 'hr', 'leave-portal'],
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '6 days'
),

-- ── Service Requests ────────────────────────────────────────────────

-- 16. New laptop request (logged)
(
  'd0000000-0002-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'SR-000101', 'service_request', 'Hardware', 'Laptop',
  'New laptop request for incoming Deputy Director',
  'Request for a Dell Latitude 5540 (Performance spec) for the incoming Deputy Director of Banking Supervision. Start date is March 15. Needs pre-configured with standard software suite plus Bloomberg Terminal access.',
  'P3_medium', 'medium', 'medium', 'logged', 'portal',
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  NULL,
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  NOW() - INTERVAL '2 hours' + INTERVAL '1 hour',
  NOW() - INTERVAL '2 hours' + INTERVAL '5 days',
  NULL, NULL,
  false, NULL,
  NULL, NULL, NULL,
  ARRAY['laptop', 'new-hire', 'executive'],
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),

-- 17. Software installation request (assigned)
(
  'd0000000-0002-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'SR-000102', 'service_request', 'Software', 'Installation',
  'Install Microsoft Visio Professional on 5 laptops — Architecture team',
  'The Enterprise Architecture team needs Microsoft Visio Professional installed on 5 laptops for diagramming work. License has been approved by procurement (PO-2024-0892). Laptop asset tags: ITD-LPT-003, 004, 005, 006, 011.',
  'P3_medium', 'medium', 'low', 'assigned', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  'c59b492e-b071-8565-6194-633cad81d471',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '1 day' + INTERVAL '1 hour',
  NOW() - INTERVAL '1 day' + INTERVAL '3 days',
  true, NULL,
  false, NOW() - INTERVAL '1 day' + INTERVAL '45 minutes',
  NULL, NULL, NULL,
  ARRAY['software', 'visio', 'installation'],
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '20 hours'
),

-- 18. New user account setup (in_progress)
(
  'd0000000-0002-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'SR-000103', 'service_request', 'Access', 'User Account',
  'Create AD account, email, and system access for 3 new hires — IT Audit',
  'Three new staff joining the IT Audit unit on March 10. Need: AD accounts, Exchange mailboxes, OPMS access (auditor role), VPN tokens, and building access cards. Names and details in attached onboarding form.',
  'P3_medium', 'medium', 'low', 'in_progress', 'email',
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  NOW() - INTERVAL '2 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '2 days' + INTERVAL '3 days',
  true, NULL,
  false, NOW() - INTERVAL '2 days' + INTERVAL '30 minutes',
  NULL, NULL, NULL,
  ARRAY['onboarding', 'user-account', 'new-hire'],
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
),

-- 19. VPN access request (resolved)
(
  'd0000000-0002-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'SR-000104', 'service_request', 'Access', 'VPN',
  'Request VPN access for remote work — Financial Stability dept',
  'User needs FortiClient VPN access for approved remote work arrangement (2 days/week). HR approval reference: RW-2024-0445. User has a CBN-issued laptop (ITD-LPT-007).',
  'P4_low', 'low', 'low', 'resolved', 'portal',
  'c59b492e-b071-8565-6194-633cad81d471',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2a5f2e13-d303-1895-16e1-1b048c9d791d',
  NOW() - INTERVAL '8 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '8 days' + INTERVAL '5 days',
  true, true,
  false, NOW() - INTERVAL '8 days' + INTERVAL '2 hours',
  'FortiClient VPN profile configured and pushed to user laptop. VPN token provisioned (RSA SecurID). User tested and confirmed connectivity from home.',
  NOW() - INTERVAL '8 days' + INTERVAL '1 day',
  NULL,
  ARRAY['vpn', 'remote-work', 'access'],
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days' + INTERVAL '1 day'
),

-- 20. Monitor request (closed)
(
  'd0000000-0002-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'SR-000105', 'service_request', 'Hardware', 'Monitor',
  'Second monitor request for dual-screen setup — Risk Management',
  'Request for Dell P2422H 24" monitor as second display. User currently has single monitor and needs dual-screen for risk analysis dashboards. Approved by unit head.',
  'P4_low', 'low', 'low', 'closed', 'portal',
  '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
  'c59b492e-b071-8565-6194-633cad81d471',
  'db40aa8c-dc75-1e84-8fc9-ef0f59c80a90',
  NOW() - INTERVAL '10 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '10 days' + INTERVAL '5 days',
  true, true,
  false, NOW() - INTERVAL '10 days' + INTERVAL '3 hours',
  'Monitor delivered and installed at user workstation. Dual-screen configured with extended display. User confirmed setup is satisfactory.',
  NOW() - INTERVAL '10 days' + INTERVAL '2 days',
  NOW() - INTERVAL '8 days',
  ARRAY['monitor', 'hardware', 'workstation'],
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days'
),

-- 21. Shared drive access (pending_customer)
(
  'd0000000-0002-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'SR-000106', 'service_request', 'Access', 'File Share',
  'Request access to Compliance shared drive for 2 staff members',
  'Two staff in Banking Supervision need read/write access to \\\\fileserver\\compliance\\reports. Waiting for data owner (Compliance HOD) approval before provisioning.',
  'P4_low', 'low', 'low', 'pending_customer', 'portal',
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  NOW() - INTERVAL '3 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '3 days' + INTERVAL '5 days',
  true, NULL,
  false, NOW() - INTERVAL '3 days' + INTERVAL '1 hour',
  NULL, NULL, NULL,
  ARRAY['file-share', 'access', 'compliance'],
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day'
),

-- 22. Conference room AV setup (logged)
(
  'd0000000-0002-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'SR-000107', 'service_request', 'Hardware', 'AV Equipment',
  'Setup video conferencing equipment in new Board Room annex',
  'The new Board Room annex on Floor 4 needs video conferencing equipment installed: 75" display, Logitech Rally camera system, ceiling microphones, and Teams Room system. Required by March 20 for Board meeting.',
  'P3_medium', 'medium', 'medium', 'logged', 'email',
  'b57c7521-672f-307c-9878-e3504b0e18d7',
  NULL,
  'ce6d2f59-7c7f-90d2-f0f6-e5560042b787',
  NOW() - INTERVAL '45 minutes' + INTERVAL '1 hour',
  NOW() - INTERVAL '45 minutes' + INTERVAL '5 days',
  NULL, NULL,
  false, NULL,
  NULL, NULL, NULL,
  ARRAY['av-equipment', 'conference-room', 'teams-room'],
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '45 minutes'
),

-- 23. Email distribution list creation (closed)
(
  'd0000000-0002-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000001',
  'SR-000108', 'service_request', 'Application', 'Email',
  'Create email distribution list for Digital Currency Working Group',
  'Need new distribution list: digital-currency-wg@cbn.gov.ng with 12 members from various departments. List should be restricted to members only (no external senders). Member list attached.',
  'P4_low', 'low', 'low', 'closed', 'portal',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '12 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '12 days' + INTERVAL '3 days',
  true, true,
  false, NOW() - INTERVAL '12 days' + INTERVAL '2 hours',
  'Distribution list created in Exchange Online. All 12 members added. Delivery restriction configured — members only. Test email sent and confirmed by requester.',
  NOW() - INTERVAL '12 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '11 days',
  ARRAY['email', 'distribution-list'],
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '11 days'
),

-- 24. Password reset (closed)
(
  'd0000000-0002-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000001',
  'SR-000109', 'service_request', 'Access', 'Password Reset',
  'AD password reset — user locked out after vacation',
  'User returned from 3-week vacation and AD account is locked. Password has expired. Needs password reset and account unlock. Identity verified via phone callback to registered number.',
  'P4_low', 'medium', 'low', 'closed', 'email',
  '90377934-1644-8547-b018-c4bb2449aaef',
  'e712da03-d912-0288-98e7-7907f066d7cd',
  'c22d15fd-f6f0-a86a-d541-f4cd13051094',
  NOW() - INTERVAL '14 days' + INTERVAL '30 minutes',
  NOW() - INTERVAL '14 days' + INTERVAL '4 hours',
  true, true,
  false, NOW() - INTERVAL '14 days' + INTERVAL '10 minutes',
  'AD account unlocked. Temporary password set and communicated to user via secure channel. User confirmed login successful.',
  NOW() - INTERVAL '14 days' + INTERVAL '20 minutes',
  NOW() - INTERVAL '14 days' + INTERVAL '1 hour',
  ARRAY['password', 'account-lockout'],
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '14 days' + INTERVAL '1 hour'
),

-- 25. Decommission old server (cancelled)
(
  'd0000000-0002-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'SR-000110', 'service_request', 'Infrastructure', 'Server',
  'Decommission legacy test server HPE DL360 Gen9',
  'Request to decommission server ITD-SRV-006 (HPE ProLiant DL360 Gen9) from Rack C-01. Server has been retired and powered off for 6 months. Need physical removal and disposal per IT asset disposal policy.',
  'P4_low', 'low', 'low', 'cancelled', 'portal',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '15 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '15 days' + INTERVAL '10 days',
  true, NULL,
  false, NOW() - INTERVAL '15 days' + INTERVAL '4 hours',
  NULL, NULL, NULL,
  ARRAY['decommission', 'server', 'disposal'],
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '12 days'
),

-- ── Change Requests ─────────────────────────────────────────────────

-- 26. Firewall rule change (assigned)
(
  'd0000000-0003-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'CHG-000101', 'change', 'Network', 'Firewall',
  'Open firewall ports for new SWIFT Alliance Lite2 connectivity',
  'SWIFT is migrating Alliance Lite2 to cloud-based Alliance Cloud. Need to open outbound TCP 443 and 8443 to SWIFT IP ranges (provided in attachment) on the perimeter FortiGate. Change window: Saturday 02:00-04:00 WAT.',
  'P2_high', 'high', 'high', 'assigned', 'portal',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '1 day' + INTERVAL '4 hours',
  NOW() - INTERVAL '1 day' + INTERVAL '3 days',
  true, NULL,
  false, NOW() - INTERVAL '1 day' + INTERVAL '2 hours',
  NULL, NULL, NULL,
  ARRAY['firewall', 'swift', 'change-request'],
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '12 hours'
),

-- 27. Windows patch deployment (in_progress)
(
  'd0000000-0003-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'CHG-000102', 'change', 'Infrastructure', 'Patching',
  'March 2026 Windows security patches — all endpoints',
  'Deploy Microsoft March 2026 Patch Tuesday updates (KB5035845, KB5035849) to all Windows 10/11 endpoints via SCCM. Includes critical RCE fix for Print Spooler. Phased rollout: IT dept first, then general population.',
  'P3_medium', 'medium', 'medium', 'in_progress', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '3 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '3 days' + INTERVAL '7 days',
  true, NULL,
  false, NOW() - INTERVAL '3 days' + INTERVAL '1 hour',
  NULL, NULL, NULL,
  ARRAY['patching', 'windows', 'security'],
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day'
),

-- 28. Network switch upgrade (closed)
(
  'd0000000-0003-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'CHG-000103', 'change', 'Network', 'Switch',
  'Replace Floor 2 access switch with Cisco Catalyst 9300',
  'End-of-life HP ProCurve switch on Floor 2 IDF to be replaced with Cisco Catalyst 9300-24P. Configuration templated from Floor 3 switch. Change window executed Saturday 06:00-10:00 WAT.',
  'P3_medium', 'medium', 'low', 'closed', 'portal',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '9 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '9 days' + INTERVAL '3 days',
  true, true,
  false, NOW() - INTERVAL '9 days' + INTERVAL '30 minutes',
  'Switch replaced successfully. All 24 ports configured and tested. VLAN trunking verified. No user impact reported on Monday morning.',
  NOW() - INTERVAL '9 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '7 days',
  ARRAY['switch', 'network', 'hardware-refresh'],
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '7 days'
),

-- 29. SSL certificate renewal (logged)
(
  'd0000000-0003-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'CHG-000104', 'change', 'Security', 'Certificate',
  'Renew SSL certificates for 4 public-facing web applications',
  'SSL certificates for the following domains expire March 25: portal.cbn.gov.ng, eservices.cbn.gov.ng, api.cbn.gov.ng, enaira.cbn.gov.ng. Need to generate CSRs, submit to DigiCert, and install renewed certificates before expiry.',
  'P2_high', 'high', 'high', 'logged', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  NULL,
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '20 minutes' + INTERVAL '4 hours',
  NOW() - INTERVAL '20 minutes' + INTERVAL '3 days',
  NULL, NULL,
  false, NULL,
  NULL, NULL, NULL,
  ARRAY['ssl', 'certificate', 'security', 'urgent'],
  NOW() - INTERVAL '20 minutes',
  NOW() - INTERVAL '20 minutes'
),

-- 30. Database version upgrade (cancelled)
(
  'd0000000-0003-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'CHG-000105', 'change', 'Application', 'Database',
  'Upgrade PostgreSQL from 14 to 16 on production OPMS database',
  'Planned upgrade of PostgreSQL 14.10 to 16.2 on the OPMS production database server. Cancelled due to vendor application compatibility concerns — vendor has not yet certified PG16.',
  'P3_medium', 'medium', 'medium', 'cancelled', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '20 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '20 days' + INTERVAL '5 days',
  true, NULL,
  false, NOW() - INTERVAL '20 days' + INTERVAL '3 hours',
  NULL, NULL, NULL,
  ARRAY['postgresql', 'upgrade', 'database'],
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '18 days'
),

-- ── Problem Tickets ─────────────────────────────────────────────────

-- 31. Recurring Outlook crashes (logged)
(
  'd0000000-0004-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'TKT-000101', 'problem', 'Application', 'Email',
  'Recurring Outlook crashes affecting multiple users on Windows 11 23H2',
  'Pattern identified: 8 separate incidents of Outlook 2021 crashing on devices running Windows 11 23H2 with the December cumulative update. Crash dump analysis shows conflict with Kaspersky Endpoint Security add-in. Need root cause analysis.',
  'P3_medium', 'medium', 'medium', 'logged', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  NULL,
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '3 hours' + INTERVAL '4 hours',
  NOW() - INTERVAL '3 hours' + INTERVAL '5 days',
  NULL, NULL,
  false, NULL,
  NULL, NULL, NULL,
  ARRAY['outlook', 'crash', 'pattern', 'problem-management'],
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours'
),

-- 32. Intermittent WiFi drops (pending_customer)
(
  'd0000000-0004-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'TKT-000102', 'problem', 'Network', 'WiFi',
  'Root cause investigation — repeated WiFi disconnections across multiple floors',
  'Recurring pattern of WiFi disconnections reported across Floors 2 and 3. 12 incidents logged in the past month. Initial investigation suggests AP firmware v29.5 has a known issue with DFS channel switching. Awaiting Meraki TAC response.',
  'P3_medium', 'medium', 'medium', 'pending_customer', 'portal',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '10 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '10 days' + INTERVAL '10 days',
  true, NULL,
  false, NOW() - INTERVAL '10 days' + INTERVAL '2 hours',
  NULL, NULL, NULL,
  ARRAY['wifi', 'root-cause', 'firmware', 'problem-management'],
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '5 days'
),

-- 33. Print spooler issues (resolved)
(
  'd0000000-0004-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'TKT-000103', 'problem', 'Infrastructure', 'Print Server',
  'Print spooler service crashing on print server after Windows Update',
  'The Print Spooler service on PRINT-SRV-01 has been crashing intermittently since KB5034441 was installed. Affects all network printers. Root cause identified as conflict between the update and HP Universal Print Driver v7.0.',
  'P3_medium', 'medium', 'medium', 'resolved', 'portal',
  'c59b492e-b071-8565-6194-633cad81d471',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '2a5f2e13-d303-1895-16e1-1b048c9d791d',
  NOW() - INTERVAL '14 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '14 days' + INTERVAL '7 days',
  true, true,
  false, NOW() - INTERVAL '14 days' + INTERVAL '3 hours',
  'Root cause: HP UPD v7.0 incompatible with KB5034441. Workaround: Updated HP UPD to v7.1.0.25570. Permanent fix: Microsoft acknowledged bug and will patch in next cumulative update.',
  NOW() - INTERVAL '14 days' + INTERVAL '3 days',
  NULL,
  ARRAY['print-spooler', 'windows-update', 'root-cause'],
  NOW() - INTERVAL '14 days',
  NOW() - INTERVAL '14 days' + INTERVAL '3 days'
),

-- 34. VPN timeout issues (pending_vendor)
(
  'd0000000-0004-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'TKT-000104', 'problem', 'Network', 'VPN',
  'VPN sessions timing out after exactly 30 minutes — FortiClient 7.2',
  'Multiple users report FortiClient VPN sessions disconnect after exactly 30 minutes regardless of activity. Issue only affects users on FortiClient 7.2.x. Users on 7.0.x are unaffected. Fortinet TAC case #12847593 opened.',
  'P3_medium', 'medium', 'medium', 'pending_vendor', 'portal',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  'f3947e51-26fa-f488-4a13-e65c608d2e7b',
  '2464f477-fd51-01ff-2cfc-edc0846be881',
  NOW() - INTERVAL '7 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '7 days' + INTERVAL '10 days',
  true, NULL,
  false, NOW() - INTERVAL '7 days' + INTERVAL '1 hour',
  NULL, NULL, NULL,
  ARRAY['vpn', 'forticlient', 'timeout', 'vendor-case'],
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '3 days'
),

-- 35. Application memory leaks (closed)
(
  'd0000000-0004-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'TKT-000105', 'problem', 'Application', 'Web Application',
  'OPMS portal memory leak causing daily restarts',
  'The OPMS web portal Node.js process grows from 200MB to 1.2GB over 8 hours, eventually causing OOM kill. Root cause traced to unclosed database connections in the reporting module. Fix deployed in v2.4.1.',
  'P3_medium', 'medium', 'medium', 'closed', 'portal',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '5db8e9fc-125b-4883-62c3-372b18e64d33',
  '4493b788-602f-e1a7-ab04-3058bbe61ff4',
  NOW() - INTERVAL '21 days' + INTERVAL '4 hours',
  NOW() - INTERVAL '21 days' + INTERVAL '7 days',
  true, true,
  false, NOW() - INTERVAL '21 days' + INTERVAL '30 minutes',
  'Root cause: Database connection pool in reporting module was not releasing connections after query timeout. Fix: Added connection.release() in finally block and set pool idle timeout to 30s. Deployed in OPMS v2.4.1. Memory stable at ~250MB for 72 hours.',
  NOW() - INTERVAL '21 days' + INTERVAL '4 days',
  NOW() - INTERVAL '17 days',
  ARRAY['memory-leak', 'nodejs', 'database-connections', 'root-cause'],
  NOW() - INTERVAL '21 days',
  NOW() - INTERVAL '17 days'
);

-- Advance the ticket sequence past our seed numbers to avoid conflicts
SELECT setval('ticket_seq', GREATEST((SELECT last_value FROM ticket_seq), 200), true);


-- ══════════════════════════════════════════════════════════════════════
-- TICKET COMMENTS (20)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO ticket_comments (id, tenant_id, ticket_id, author_id, content, is_internal, created_at) VALUES

-- Core Banking outage comments
('e0000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000001',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'Initial investigation: Application tier showing 503 on all 4 app servers. Database cluster (primary + 2 replicas) healthy. CPU and memory within normal range. Checking application logs now.',
 true, NOW() - INTERVAL '4 hours' + INTERVAL '15 minutes'),

('e0000000-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000001',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'Root cause identified: Connection pool exhaustion on app servers. Max connections set to 200 but current count is 200/200 on all nodes. Stale connections not being recycled. Restarting app tier in rolling fashion.',
 true, NOW() - INTERVAL '3 hours'),

('e0000000-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000001',
 'b57c7521-672f-307c-9878-e3504b0e18d7',
 'Management has been notified. Deputy Governor''s office requesting hourly updates. Please ensure all communications go through the Incident Commander.',
 false, NOW() - INTERVAL '3 hours' + INTERVAL '30 minutes'),

('e0000000-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000001',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'App server 1 and 2 restarted successfully. Services coming back online. Monitoring connection pool metrics. Will restart servers 3 and 4 next.',
 true, NOW() - INTERVAL '2 hours'),

-- Email system comments
('e0000000-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000002',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'Hybrid connector certificate expired at midnight. This is blocking authentication between on-prem Exchange and Exchange Online. Generating new certificate now.',
 true, NOW() - INTERVAL '1 hour' + INTERVAL '30 minutes'),

('e0000000-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000002',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'New certificate generated and installed on the hybrid connector server. Restarting Microsoft Exchange Hybrid Configuration service. Mail flow should resume within 15 minutes.',
 true, NOW() - INTERVAL '45 minutes'),

-- VPN concentrator comments
('e0000000-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000004',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'Contacted Fortinet for emergency license upgrade. They can provision additional 500 concurrent sessions within 2 hours. In the meantime, disconnecting idle sessions (>30 min inactive).',
 true, NOW() - INTERVAL '5 hours'),

('e0000000-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000004',
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
 'Staff in my unit are still unable to connect. When will this be resolved? We have a regulatory submission deadline today.',
 false, NOW() - INTERVAL '4 hours'+ INTERVAL '30 minutes'),

-- AD replication comments
('e0000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000005',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'Microsoft Premier Support case SR2408150034 opened. Engineer assigned and will do remote session at 14:00 WAT tomorrow.',
 true, NOW() - INTERVAL '20 hours'),

-- Database performance comments
('e0000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000007',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'ANALYZE and VACUUM FULL running on audit_events table (120M rows). Expected to take ~45 minutes. Also creating missing index on created_at column.',
 true, NOW() - INTERVAL '4 hours'),

('e0000000-0001-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000007',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'VACUUM complete. Query time for monthly report dropped from 45s to 1.2s. Will also add partitioning by month as a permanent fix via a change request.',
 true, NOW() - INTERVAL '3 hours'),

-- User account setup comments
('e0000000-0001-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'd0000000-0002-0000-0000-000000000003',
 'e712da03-d912-0288-98e7-7907f066d7cd',
 'AD accounts created for all 3 users. Email provisioning in progress. OPMS access requests submitted — awaiting admin approval.',
 false, NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),

-- Firewall change comments
('e0000000-0001-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'd0000000-0003-0000-0000-000000000001',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'CAB (Change Advisory Board) approval received. Change scheduled for Saturday 02:00-04:00 WAT. Rollback plan documented. SWIFT connectivity test scheduled for 04:00.',
 true, NOW() - INTERVAL '12 hours'),

-- Patching change comments
('e0000000-0001-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'd0000000-0003-0000-0000-000000000002',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'Phase 1 complete: IT department (45 machines) patched successfully. No issues reported. Phase 2 (Floor 2 — 80 machines) will start tonight at 22:00.',
 true, NOW() - INTERVAL '1 day' + INTERVAL '6 hours'),

-- WiFi problem comments
('e0000000-0001-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'd0000000-0004-0000-0000-000000000002',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'Meraki TAC confirmed firmware v29.5 has a bug with DFS channel handling. Recommended workaround: manually set APs to non-DFS channels (36, 40, 44, 48). Permanent fix expected in v29.6.',
 true, NOW() - INTERVAL '5 days' + INTERVAL '4 hours'),

-- Print spooler problem comments
('e0000000-0001-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'd0000000-0004-0000-0000-000000000003',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'Confirmed: HP UPD v7.0 triggers a race condition in the spooler when processing duplex jobs. Updated to HP UPD v7.1.0.25570 which resolves the issue. Monitoring for 48 hours.',
 true, NOW() - INTERVAL '14 days' + INTERVAL '2 days'),

-- VPN timeout problem comments
('e0000000-0001-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'd0000000-0004-0000-0000-000000000004',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 'Fortinet TAC reproduced the issue. It is a known bug in FortiClient 7.2.1-7.2.3. Fixed in 7.2.4 which is currently in QA. ETA for release: 2 weeks. Workaround: set idle timeout to 0 on the FortiGate SSL-VPN settings.',
 true, NOW() - INTERVAL '4 days'),

-- Memory leak problem comments
('e0000000-0001-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'd0000000-0004-0000-0000-000000000005',
 '5db8e9fc-125b-4883-62c3-372b18e64d33',
 'Heap dump analysis complete. The leak is in the reporting module''s database connection handling. When a query times out, the connection is not returned to the pool. Simple fix: add connection.release() in the finally block.',
 true, NOW() - INTERVAL '21 days' + INTERVAL '2 days'),

-- Scanner issue comment
('e0000000-0001-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000013',
 'c59b492e-b071-8565-6194-633cad81d471',
 'Called user twice — no answer. Left voicemail requesting callback to schedule remote session. Will try again tomorrow morning.',
 true, NOW() - INTERVAL '3 days'),

-- Blue screen comment
('e0000000-0001-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000012',
 'c59b492e-b071-8565-6194-633cad81d471',
 'Ran Dell diagnostics — memory test passed. WHEA error points to CPU thermal issue. Reapplied thermal paste and cleaned fans. Monitoring for BSOD recurrence over the next 2 days.',
 true, NOW() - INTERVAL '1 day' + INTERVAL '3 hours');


-- ══════════════════════════════════════════════════════════════════════
-- CSAT SURVEYS (8) — for resolved/closed tickets
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO csat_surveys (id, ticket_id, respondent_id, rating, comment, created_at) VALUES
('f0000000-0001-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000003', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 4, 'Fast response and good communication throughout. Would have been 5 but took longer than expected.', NOW() - INTERVAL '3 days' + INTERVAL '10 hours'),
('f0000000-0001-0000-0000-000000000002', 'd0000000-0001-0000-0000-000000000006', '90377934-1644-8547-b018-c4bb2449aaef', 5, 'Excellent! Fixed quickly and kept us informed. Thank you.', NOW() - INTERVAL '2 days' + INTERVAL '5 hours'),
('f0000000-0001-0000-0000-000000000003', 'd0000000-0001-0000-0000-000000000009', '90377934-1644-8547-b018-c4bb2449aaef', 4, 'WiFi issue resolved. Took a few days but understandable given the complexity.', NOW() - INTERVAL '4 days' + INTERVAL '2 hours'),
('f0000000-0001-0000-0000-000000000004', 'd0000000-0001-0000-0000-000000000014', '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', 5, 'Internet speed back to normal. Great job by the network team!', NOW() - INTERVAL '6 days' + INTERVAL '6 hours'),
('f0000000-0001-0000-0000-000000000005', 'd0000000-0001-0000-0000-000000000015', 'c59b492e-b071-8565-6194-633cad81d471', 3, 'Issue was resolved but it should not have happened in the first place. Deployment testing needs improvement.', NOW() - INTERVAL '6 days' + INTERVAL '3 hours'),
('f0000000-0001-0000-0000-000000000006', 'd0000000-0002-0000-0000-000000000005', '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', 5, 'Monitor delivered and setup was quick. Very happy with the dual-screen configuration.', NOW() - INTERVAL '8 days' + INTERVAL '2 hours'),
('f0000000-0001-0000-0000-000000000007', 'd0000000-0002-0000-0000-000000000008', 'e712da03-d912-0288-98e7-7907f066d7cd', 4, 'Distribution list created promptly. Minor delay in getting the restriction settings right.', NOW() - INTERVAL '11 days' + INTERVAL '3 hours'),
('f0000000-0001-0000-0000-000000000008', 'd0000000-0002-0000-0000-000000000009', '90377934-1644-8547-b018-c4bb2449aaef', 5, 'Password reset done within minutes. Very efficient!', NOW() - INTERVAL '14 days' + INTERVAL '2 hours');


-- ══════════════════════════════════════════════════════════════════════
-- SLA BREACH LOG (5) — for tickets that breached SLA
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO sla_breach_log (id, ticket_id, breach_type, breached_at, target_was, actual_duration_minutes, created_at) VALUES
-- AD replication ticket — resolution SLA breached
('f1000000-0001-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000005', 'resolution', NOW() - INTERVAL '1 day' + INTERVAL '8 hours', NOW() - INTERVAL '1 day' + INTERVAL '8 hours', 600, NOW() - INTERVAL '1 day' + INTERVAL '8 hours'),
-- Scanner pending customer — resolution SLA breached (waiting on customer too long)
('f1000000-0001-0000-0000-000000000002', 'd0000000-0001-0000-0000-000000000013', 'resolution', NOW() - INTERVAL '4 days' + INTERVAL '24 hours', NOW() - INTERVAL '4 days' + INTERVAL '24 hours', 1500, NOW() - INTERVAL '4 days' + INTERVAL '24 hours'),
-- WiFi problem — resolution SLA approaching breach
('f1000000-0001-0000-0000-000000000003', 'd0000000-0004-0000-0000-000000000002', 'resolution', NOW() - INTERVAL '10 days' + INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '10 days', 14400, NOW() - INTERVAL '10 days' + INTERVAL '10 days'),
-- Shared drive access — response SLA breached (slow initial response)
('f1000000-0001-0000-0000-000000000004', 'd0000000-0002-0000-0000-000000000006', 'response', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', 65, NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
-- VPN timeout problem — resolution SLA breached (vendor dependency)
('f1000000-0001-0000-0000-000000000005', 'd0000000-0004-0000-0000-000000000004', 'resolution', NOW() - INTERVAL '7 days' + INTERVAL '10 days', NOW() - INTERVAL '7 days' + INTERVAL '10 days', 10080, NOW() - INTERVAL '7 days' + INTERVAL '10 days');


-- ══════════════════════════════════════════════════════════════════════
-- STATUS HISTORY (sample transitions for active tickets)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO ticket_status_history (id, tenant_id, ticket_id, from_status, to_status, changed_by, reason, created_at) VALUES
-- Core Banking: logged → assigned → in_progress
('f2000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000001', 'logged', 'assigned', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'Self-assigned — Infrastructure Lead taking ownership', NOW() - INTERVAL '4 hours' + INTERVAL '8 minutes'),
('f2000000-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000001', 'assigned', 'in_progress', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'Investigation started', NOW() - INTERVAL '4 hours' + INTERVAL '10 minutes'),

-- Email system: logged → assigned
('f2000000-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000002', 'logged', 'assigned', '5db8e9fc-125b-4883-62c3-372b18e64d33', 'Assigned to messaging team lead', NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes'),

-- VPN: logged → assigned → in_progress
('f2000000-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000004', 'logged', 'assigned', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', NULL, NOW() - INTERVAL '6 hours' + INTERVAL '15 minutes'),
('f2000000-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000004', 'assigned', 'in_progress', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'Contacting Fortinet for license upgrade', NOW() - INTERVAL '6 hours' + INTERVAL '20 minutes'),

-- AD replication: logged → assigned → in_progress → pending_vendor
('f2000000-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000005', 'logged', 'assigned', '5db8e9fc-125b-4883-62c3-372b18e64d33', NULL, NOW() - INTERVAL '1 day' + INTERVAL '15 minutes'),
('f2000000-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000005', 'assigned', 'in_progress', '5db8e9fc-125b-4883-62c3-372b18e64d33', 'Investigating replication errors', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),
('f2000000-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000005', 'in_progress', 'pending_vendor', '5db8e9fc-125b-4883-62c3-372b18e64d33', 'Escalated to Microsoft Premier Support', NOW() - INTERVAL '20 hours'),

-- Printer floor 2: logged → assigned → in_progress → resolved
('f2000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000006', 'logged', 'assigned', 'c59b492e-b071-8565-6194-633cad81d471', NULL, NOW() - INTERVAL '2 days' + INTERVAL '20 minutes'),
('f2000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000006', 'assigned', 'in_progress', 'c59b492e-b071-8565-6194-633cad81d471', 'Checking VLAN configuration on new switch', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes'),
('f2000000-0001-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000006', 'in_progress', 'resolved', 'c59b492e-b071-8565-6194-633cad81d471', 'VLAN trunking reconfigured', NOW() - INTERVAL '2 days' + INTERVAL '3 hours'),

-- WiFi closed: logged → assigned → in_progress → resolved → closed
('f2000000-0001-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000009', 'logged', 'assigned', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', NULL, NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
('f2000000-0001-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000009', 'assigned', 'in_progress', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'Investigating AP firmware', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),
('f2000000-0001-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000009', 'in_progress', 'resolved', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'Firmware rolled back', NOW() - INTERVAL '5 days' + INTERVAL '6 hours'),
('f2000000-0001-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000009', 'resolved', 'closed', 'f3947e51-26fa-f488-4a13-e65c608d2e7b', 'User confirmed — no recurrence for 24 hours', NOW() - INTERVAL '4 days');


-- +goose Down
DELETE FROM ticket_status_history WHERE id IN (
  'f2000000-0001-0000-0000-000000000001', 'f2000000-0001-0000-0000-000000000002',
  'f2000000-0001-0000-0000-000000000003', 'f2000000-0001-0000-0000-000000000004',
  'f2000000-0001-0000-0000-000000000005', 'f2000000-0001-0000-0000-000000000006',
  'f2000000-0001-0000-0000-000000000007', 'f2000000-0001-0000-0000-000000000008',
  'f2000000-0001-0000-0000-000000000009', 'f2000000-0001-0000-0000-000000000010',
  'f2000000-0001-0000-0000-000000000011', 'f2000000-0001-0000-0000-000000000012',
  'f2000000-0001-0000-0000-000000000013', 'f2000000-0001-0000-0000-000000000014',
  'f2000000-0001-0000-0000-000000000015'
);
DELETE FROM sla_breach_log WHERE id IN (
  'f1000000-0001-0000-0000-000000000001', 'f1000000-0001-0000-0000-000000000002',
  'f1000000-0001-0000-0000-000000000003', 'f1000000-0001-0000-0000-000000000004',
  'f1000000-0001-0000-0000-000000000005'
);
DELETE FROM csat_surveys WHERE id IN (
  'f0000000-0001-0000-0000-000000000001', 'f0000000-0001-0000-0000-000000000002',
  'f0000000-0001-0000-0000-000000000003', 'f0000000-0001-0000-0000-000000000004',
  'f0000000-0001-0000-0000-000000000005', 'f0000000-0001-0000-0000-000000000006',
  'f0000000-0001-0000-0000-000000000007', 'f0000000-0001-0000-0000-000000000008'
);
DELETE FROM ticket_comments WHERE id IN (
  'e0000000-0001-0000-0000-000000000001', 'e0000000-0001-0000-0000-000000000002',
  'e0000000-0001-0000-0000-000000000003', 'e0000000-0001-0000-0000-000000000004',
  'e0000000-0001-0000-0000-000000000005', 'e0000000-0001-0000-0000-000000000006',
  'e0000000-0001-0000-0000-000000000007', 'e0000000-0001-0000-0000-000000000008',
  'e0000000-0001-0000-0000-000000000009', 'e0000000-0001-0000-0000-000000000010',
  'e0000000-0001-0000-0000-000000000011', 'e0000000-0001-0000-0000-000000000012',
  'e0000000-0001-0000-0000-000000000013', 'e0000000-0001-0000-0000-000000000014',
  'e0000000-0001-0000-0000-000000000015', 'e0000000-0001-0000-0000-000000000016',
  'e0000000-0001-0000-0000-000000000017', 'e0000000-0001-0000-0000-000000000018',
  'e0000000-0001-0000-0000-000000000019', 'e0000000-0001-0000-0000-000000000020'
);
DELETE FROM tickets WHERE id IN (
  'd0000000-0001-0000-0000-000000000001', 'd0000000-0001-0000-0000-000000000002',
  'd0000000-0001-0000-0000-000000000003', 'd0000000-0001-0000-0000-000000000004',
  'd0000000-0001-0000-0000-000000000005', 'd0000000-0001-0000-0000-000000000006',
  'd0000000-0001-0000-0000-000000000007', 'd0000000-0001-0000-0000-000000000008',
  'd0000000-0001-0000-0000-000000000009', 'd0000000-0001-0000-0000-000000000010',
  'd0000000-0001-0000-0000-000000000011', 'd0000000-0001-0000-0000-000000000012',
  'd0000000-0001-0000-0000-000000000013', 'd0000000-0001-0000-0000-000000000014',
  'd0000000-0001-0000-0000-000000000015',
  'd0000000-0002-0000-0000-000000000001', 'd0000000-0002-0000-0000-000000000002',
  'd0000000-0002-0000-0000-000000000003', 'd0000000-0002-0000-0000-000000000004',
  'd0000000-0002-0000-0000-000000000005', 'd0000000-0002-0000-0000-000000000006',
  'd0000000-0002-0000-0000-000000000007', 'd0000000-0002-0000-0000-000000000008',
  'd0000000-0002-0000-0000-000000000009', 'd0000000-0002-0000-0000-000000000010',
  'd0000000-0003-0000-0000-000000000001', 'd0000000-0003-0000-0000-000000000002',
  'd0000000-0003-0000-0000-000000000003', 'd0000000-0003-0000-0000-000000000004',
  'd0000000-0003-0000-0000-000000000005',
  'd0000000-0004-0000-0000-000000000001', 'd0000000-0004-0000-0000-000000000002',
  'd0000000-0004-0000-0000-000000000003', 'd0000000-0004-0000-0000-000000000004',
  'd0000000-0004-0000-0000-000000000005'
);

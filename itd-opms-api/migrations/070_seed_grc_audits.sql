-- +goose Up
-- Seed GRC Audits, Findings, and Evidence Collections for ITD tenant.

-- ─── Audits ──────────────────────────────────────────────────────────────

-- 1. ISO 27001 ISMS Internal Audit (completed)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000001',
 'ISO 27001:2022 ISMS Annual Internal Audit',
 'internal',
 'Full review of the Information Security Management System covering access controls, incident management, risk treatment plans, business continuity, and supplier management (Annex A controls A.5–A.8).',
 'Amina Yusuf',
 'ITD Internal Audit Team',
 'completed',
 '2025-10-01', '2025-11-15',
 '[{"control":"A.5.1","description":"Information security policies"},{"control":"A.6.1","description":"Screening"},{"control":"A.8.1","description":"User endpoint devices"},{"control":"A.8.5","description":"Secure authentication"}]',
 95.00,
 '90377934-1644-8547-b018-c4bb2449aaef',
 '2025-09-15 09:00:00+01', '2025-11-20 14:30:00+01');

-- 2. CBN IT Standards Compliance Audit (completed)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000002', '00000000-0000-0000-0000-000000000001',
 'CBN IT Standards & Frameworks Compliance Audit 2025',
 'regulatory',
 'Assessment of compliance with the CBN IT Standards Framework covering IT governance, risk management, information security, IT operations, and business continuity management for financial institutions.',
 'External — Deloitte Nigeria',
 'CBN Banking Supervision Department',
 'completed',
 '2025-07-01', '2025-08-30',
 '[{"control":"ITG-01","description":"IT Governance structure"},{"control":"ISM-03","description":"Data classification and handling"},{"control":"ITO-05","description":"Change management process"},{"control":"BCM-02","description":"DR testing evidence"}]',
 88.50,
 'c0c0c0c0-0000-4000-a000-000000000003',
 '2025-06-01 10:00:00+01', '2025-09-10 16:00:00+01');

-- 3. Data Centre Infrastructure Audit (in_progress)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'Data Centre Physical Security & Environmental Controls Audit',
 'internal',
 'Assessment of physical access controls, fire suppression systems, UPS/generator redundancy, environmental monitoring (temperature, humidity), cable management, and CCTV coverage at the primary and DR data centres.',
 'Chukwuemeka Okafor',
 'ITD Cyber Security Office',
 'in_progress',
 '2026-02-15', '2026-04-30',
 '[{"control":"PE-01","description":"Physical access authorization"},{"control":"PE-03","description":"Environmental controls monitoring"},{"control":"PE-06","description":"CCTV and surveillance records"},{"control":"PE-09","description":"Power redundancy test logs"}]',
 62.00,
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
 '2026-01-20 09:00:00+01', '2026-03-25 11:00:00+01');

-- 4. NDPR Data Privacy Compliance Audit (findings_review)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000001',
 'Nigeria Data Protection Regulation (NDPR) Compliance Audit',
 'regulatory',
 'Review of personal data processing activities, consent mechanisms, data subject rights implementation, cross-border data transfers, breach notification procedures, and Data Protection Impact Assessments (DPIAs) in alignment with the NDPR 2019 and NDPA 2023.',
 'External — KPMG Nigeria',
 'Nigeria Data Protection Commission (NDPC)',
 'findings_review',
 '2026-01-10', '2026-03-15',
 '[{"control":"NDPR-2.1","description":"Lawful basis for processing"},{"control":"NDPR-3.1","description":"Data subject consent records"},{"control":"NDPR-4.2","description":"Breach notification logs"},{"control":"NDPR-5.1","description":"DPIA documentation"}]',
 78.00,
 'c0c0c0c0-0000-4000-a000-000000000003',
 '2025-12-01 10:00:00+01', '2026-03-20 15:00:00+01');

-- 5. Third-Party Vendor Risk Assessment (preparing)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000005', '00000000-0000-0000-0000-000000000001',
 'Third-Party Vendor & Cloud Service Provider Risk Assessment',
 'external',
 'Due diligence review of critical IT vendors and cloud service providers, including SLA compliance, SOC 2 report reviews, data residency verification, and supply chain risk assessment for the top 15 vendors by spend.',
 'Fatima Ibrahim',
 'ITD Business Information Security Office',
 'preparing',
 '2026-04-01', '2026-06-15',
 '[{"control":"SR-01","description":"Vendor SOC 2 Type II reports"},{"control":"SR-03","description":"SLA compliance dashboards"},{"control":"SR-05","description":"Data residency confirmation"},{"control":"SR-07","description":"Vendor incident history"}]',
 25.00,
 'e712da03-d912-0288-98e7-7907f066d7cd',
 '2026-03-01 09:00:00+01', '2026-03-27 10:00:00+01');

-- 6. Penetration Testing & Vulnerability Assessment (planned)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000006', '00000000-0000-0000-0000-000000000001',
 'Annual Penetration Testing & Vulnerability Assessment 2026',
 'external',
 'External and internal network penetration testing, web application security assessment (OWASP Top 10), API security testing, social engineering assessment, and wireless network security evaluation.',
 'External — Cyberplural Ltd',
 'ITD Cyber Security Office',
 'planned',
 '2026-05-01', '2026-06-30',
 '[{"control":"PT-01","description":"Network scan results (Nessus/Qualys)"},{"control":"PT-03","description":"Web app DAST results"},{"control":"PT-05","description":"Social engineering test report"},{"control":"PT-07","description":"Remediation tracking"}]',
 0.00,
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
 '2026-03-25 09:00:00+01', '2026-03-25 09:00:00+01');

-- 7. IT Service Management (ITSM) Process Audit (in_progress)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000007', '00000000-0000-0000-0000-000000000001',
 'ITIL-Aligned IT Service Management Process Audit',
 'internal',
 'Evaluation of ITSM processes including incident management, problem management, change management, service request fulfilment, and service level management against ITIL 4 best practices.',
 'Oluwaseun Adeyemi',
 'ITD Information Systems Security Office',
 'in_progress',
 '2026-03-01', '2026-04-30',
 '[{"control":"ITSM-01","description":"Incident response time SLAs"},{"control":"ITSM-03","description":"Change advisory board minutes"},{"control":"ITSM-05","description":"Problem root cause analyses"},{"control":"ITSM-07","description":"CMDB accuracy metrics"}]',
 45.00,
 'f3947e51-26fa-f488-4a13-e65c608d2e7b',
 '2026-02-15 10:00:00+01', '2026-03-26 14:00:00+01');

-- 8. Business Continuity & Disaster Recovery Audit (completed)
INSERT INTO grc_audits (id, tenant_id, title, audit_type, scope, auditor, audit_body, status, scheduled_start, scheduled_end, evidence_requirements, readiness_score, created_by, created_at, updated_at) VALUES
('a0000001-0000-4000-b000-000000000008', '00000000-0000-0000-0000-000000000001',
 'Business Continuity & Disaster Recovery Readiness Audit',
 'internal',
 'Assessment of BC/DR plans, RTO/RPO targets validation, failover testing results, backup integrity verification, crisis communication procedures, and alternate site readiness.',
 'Musa Abdullahi',
 'ITD Planning & Operations Support Office',
 'completed',
 '2025-11-01', '2025-12-20',
 '[{"control":"BC-01","description":"BIA documents"},{"control":"BC-03","description":"DR test execution logs"},{"control":"BC-05","description":"Backup restoration test results"},{"control":"BC-07","description":"Crisis communication plan"}]',
 92.00,
 'c59b492e-b071-8565-6194-633cad81d471',
 '2025-10-01 09:00:00+01', '2025-12-22 16:00:00+01');


-- ─── Audit Findings ─────────────────────────────────────────────────────

-- Findings for Audit 1 (ISO 27001 — completed)
INSERT INTO audit_findings (id, audit_id, tenant_id, finding_number, title, description, severity, status, remediation_plan, owner_id, due_date, closed_at, created_at, updated_at) VALUES
('f0000001-0000-4000-b000-000000000001',
 'a0000001-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000001',
 'FND-0001', 'Privileged access review not conducted quarterly',
 'The quarterly review of privileged accounts (domain admins, database admins, and application super-users) was not performed in Q2 and Q3 2025, resulting in 14 stale admin accounts remaining active.',
 'high', 'closed',
 'Implement automated quarterly PAM review via CyberArk and integrate with OPMS workflow for sign-off.',
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', '2025-12-31', '2025-12-15 10:00:00+01',
 '2025-11-01 10:00:00+01', '2025-12-15 10:00:00+01'),

('f0000001-0000-4000-b000-000000000002',
 'a0000001-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000001',
 'FND-0002', 'Missing encryption at rest for legacy file shares',
 'Three legacy network file shares containing classified documents were found without BitLocker or equivalent encryption at rest, violating control A.8.24.',
 'medium', 'closed',
 'Migrate file shares to encrypted SharePoint Online or enable BitLocker on file server volumes.',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2026-01-31', '2026-01-20 14:00:00+01',
 '2025-11-05 10:00:00+01', '2026-01-20 14:00:00+01'),

('f0000001-0000-4000-b000-000000000003',
 'a0000001-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000001',
 'FND-0003', 'Incident response plan not tested in 12 months',
 'The Information Security Incident Response Plan (ISIRP) has not been tested via tabletop exercise since October 2024, exceeding the annual testing requirement.',
 'medium', 'accepted',
 'Schedule tabletop exercise for Q1 2026 with scenario based on recent ransomware threats.',
 '90377934-1644-8547-b018-c4bb2449aaef', '2026-03-31', NULL,
 '2025-11-10 10:00:00+01', '2025-12-01 10:00:00+01');

-- Findings for Audit 2 (CBN IT Standards — completed)
INSERT INTO audit_findings (id, audit_id, tenant_id, finding_number, title, description, severity, status, remediation_plan, owner_id, due_date, closed_at, created_at, updated_at) VALUES
('f0000001-0000-4000-b000-000000000004',
 'a0000001-0000-4000-b000-000000000002', '00000000-0000-0000-0000-000000000001',
 'FND-0001', 'IT risk register not updated after infrastructure migration',
 'The enterprise IT risk register was not refreshed after the cloud migration completed in Q1 2025. Several new cloud-specific risks (misconfigured storage buckets, identity federation) were not captured.',
 'high', 'closed',
 'Conduct comprehensive risk reassessment incorporating cloud-native risks. Update OPMS risk register module.',
 'e712da03-d912-0288-98e7-7907f066d7cd', '2025-10-31', '2025-10-28 10:00:00+01',
 '2025-08-15 10:00:00+01', '2025-10-28 10:00:00+01'),

('f0000001-0000-4000-b000-000000000005',
 'a0000001-0000-4000-b000-000000000002', '00000000-0000-0000-0000-000000000001',
 'FND-0002', 'Change advisory board records incomplete',
 'CAB meeting minutes for 6 out of 24 fortnightly sessions were missing or incomplete, with no documented risk assessment for 12 emergency changes.',
 'medium', 'closed',
 'Enforce mandatory CAB minute templates in OPMS and require digital sign-off before change implementation.',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2025-11-30', '2025-11-25 14:00:00+01',
 '2025-08-20 10:00:00+01', '2025-11-25 14:00:00+01');

-- Findings for Audit 3 (Data Centre — in_progress)
INSERT INTO audit_findings (id, audit_id, tenant_id, finding_number, title, description, severity, status, remediation_plan, owner_id, due_date, created_at, updated_at) VALUES
('f0000001-0000-4000-b000-000000000006',
 'a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'FND-0001', 'CCTV blind spots identified in server room corridor',
 'Two corridor sections between server racks B3–B5 and C1–C3 have no CCTV coverage due to camera positioning. Physical access logs show 340 entries in these corridors in the past 90 days.',
 'high', 'remediation_planned',
 'Install two additional PTZ cameras in identified blind spots. Target completion: April 2026.',
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', '2026-04-30',
 '2026-03-10 10:00:00+01', '2026-03-10 10:00:00+01'),

('f0000001-0000-4000-b000-000000000007',
 'a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'FND-0002', 'UPS battery replacement overdue by 6 months',
 'Battery replacement for UPS Unit 2 (APC Symmetra PX 250kW) was due in September 2025 but has not been completed. Runtime testing shows degraded capacity of 68% vs. rated 100%.',
 'critical', 'in_remediation',
 'Emergency procurement of replacement battery modules initiated. Interim: reduce non-critical load on UPS Unit 2.',
 'c59b492e-b071-8565-6194-633cad81d471', '2026-04-15',
 '2026-03-12 10:00:00+01', '2026-03-20 10:00:00+01'),

('f0000001-0000-4000-b000-000000000008',
 'a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'FND-0003', 'Environmental monitoring alerts not routing to on-call team',
 'Temperature and humidity alerts from the BMS system are configured to email a distribution list that includes two former staff members and excludes the current on-call duty roster.',
 'medium', 'open',
 NULL,
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2026-04-30',
 '2026-03-15 10:00:00+01', '2026-03-15 10:00:00+01');

-- Findings for Audit 4 (NDPR — findings_review)
INSERT INTO audit_findings (id, audit_id, tenant_id, finding_number, title, description, severity, status, remediation_plan, owner_id, due_date, created_at, updated_at) VALUES
('f0000001-0000-4000-b000-000000000009',
 'a0000001-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000001',
 'FND-0001', 'Data subject access request process exceeds 30-day SLA',
 'Analysis of 23 DSARs received in 2025 shows an average response time of 42 days, exceeding the NDPR-mandated 30-day window. Three requests took over 60 days.',
 'high', 'remediation_planned',
 'Automate DSAR intake via self-service portal. Assign dedicated DSAR coordinator in ITD.',
 '90377934-1644-8547-b018-c4bb2449aaef', '2026-05-31',
 '2026-03-01 10:00:00+01', '2026-03-15 10:00:00+01'),

('f0000001-0000-4000-b000-000000000010',
 'a0000001-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000001',
 'FND-0002', 'No DPIA conducted for new HR analytics platform',
 'The HR Performance Analytics module (deployed January 2026) processes employee biometric and performance data but no Data Protection Impact Assessment was conducted prior to deployment.',
 'critical', 'open',
 NULL,
 'e712da03-d912-0288-98e7-7907f066d7cd', '2026-04-30',
 '2026-03-05 10:00:00+01', '2026-03-05 10:00:00+01'),

('f0000001-0000-4000-b000-000000000011',
 'a0000001-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000001',
 'FND-0003', 'Consent records not centrally managed',
 'Data processing consent records are stored in five separate systems (CRM, HR portal, email archives, paper forms, helpdesk) with no consolidated consent management platform.',
 'medium', 'open',
 NULL,
 '90377934-1644-8547-b018-c4bb2449aaef', '2026-06-30',
 '2026-03-08 10:00:00+01', '2026-03-08 10:00:00+01');

-- Findings for Audit 7 (ITSM — in_progress)
INSERT INTO audit_findings (id, audit_id, tenant_id, finding_number, title, description, severity, status, remediation_plan, owner_id, due_date, created_at, updated_at) VALUES
('f0000001-0000-4000-b000-000000000012',
 'a0000001-0000-4000-b000-000000000007', '00000000-0000-0000-0000-000000000001',
 'FND-0001', 'P1 incident resolution time exceeds target SLA',
 'Average P1 incident resolution time is 6.2 hours against a 4-hour SLA target. Root cause analysis shows escalation delays between L1 and L2 support.',
 'high', 'in_remediation',
 'Implement automated escalation rules in OPMS ITSM module. Conduct L1-L2 handoff training.',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '2026-04-30',
 '2026-03-15 10:00:00+01', '2026-03-22 10:00:00+01'),

('f0000001-0000-4000-b000-000000000013',
 'a0000001-0000-4000-b000-000000000007', '00000000-0000-0000-0000-000000000001',
 'FND-0002', 'CMDB accuracy below 85% threshold',
 'Spot-check of 200 configuration items shows 23% discrepancy rate between CMDB records and actual deployed assets, primarily in software licensing and virtual machine inventory.',
 'medium', 'open',
 NULL,
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', '2026-05-31',
 '2026-03-18 10:00:00+01', '2026-03-18 10:00:00+01');


-- ─── Evidence Collections ────────────────────────────────────────────────

-- Evidence for Audit 1 (ISO 27001 — completed)
INSERT INTO evidence_collections (id, audit_id, tenant_id, title, description, status, evidence_item_ids, collector_id, reviewer_id, approved_at, checksum, created_at, updated_at) VALUES
('e0000001-0000-4000-b000-000000000001',
 'a0000001-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000001',
 'Access Control Policies & Reviews',
 'Collection of access control policy documents, PAM review reports, and user access matrices for the audit period.',
 'approved', '{}',
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', '90377934-1644-8547-b018-c4bb2449aaef',
 '2025-11-10 14:00:00+01', 'sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
 '2025-10-15 10:00:00+01', '2025-11-10 14:00:00+01'),

('e0000001-0000-4000-b000-000000000002',
 'a0000001-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000001',
 'Incident Management Records',
 'Incident tickets, post-incident review reports, and lessons-learned documentation from Q1–Q3 2025.',
 'approved', '{}',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', '90377934-1644-8547-b018-c4bb2449aaef',
 '2025-11-12 10:00:00+01', 'sha256:b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
 '2025-10-18 10:00:00+01', '2025-11-12 10:00:00+01');

-- Evidence for Audit 3 (Data Centre — in_progress)
INSERT INTO evidence_collections (id, audit_id, tenant_id, title, description, status, evidence_item_ids, collector_id, reviewer_id, approved_at, checksum, created_at, updated_at) VALUES
('e0000001-0000-4000-b000-000000000003',
 'a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'Physical Access Logs — Primary DC',
 'Badge reader logs, visitor sign-in sheets, and escort records for the Abuja primary data centre (Jan–Mar 2026).',
 'approved', '{}',
 '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8', 'c59b492e-b071-8565-6194-633cad81d471',
 '2026-03-20 14:00:00+01', 'sha256:c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
 '2026-03-05 10:00:00+01', '2026-03-20 14:00:00+01'),

('e0000001-0000-4000-b000-000000000004',
 'a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'Environmental Monitoring Reports',
 'BMS temperature and humidity sensor data exports, alert history, and threshold configuration for both DC facilities.',
 'collecting', '{}',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', NULL,
 NULL, NULL,
 '2026-03-10 10:00:00+01', '2026-03-25 10:00:00+01'),

('e0000001-0000-4000-b000-000000000005',
 'a0000001-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000001',
 'UPS & Generator Maintenance Records',
 'Scheduled maintenance logs, battery test results, generator runtime reports, and fuel consumption records.',
 'review', '{}',
 'c59b492e-b071-8565-6194-633cad81d471', '7d3f9d2a-0340-a89e-c8cb-03ca50a5d0e8',
 NULL, NULL,
 '2026-03-08 10:00:00+01', '2026-03-22 10:00:00+01');

-- Evidence for Audit 4 (NDPR — findings_review)
INSERT INTO evidence_collections (id, audit_id, tenant_id, title, description, status, evidence_item_ids, collector_id, reviewer_id, approved_at, checksum, created_at, updated_at) VALUES
('e0000001-0000-4000-b000-000000000006',
 'a0000001-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000001',
 'DSAR Response Records',
 'All Data Subject Access Request correspondence, internal processing notes, and response letters for 2025.',
 'approved', '{}',
 '90377934-1644-8547-b018-c4bb2449aaef', 'e712da03-d912-0288-98e7-7907f066d7cd',
 '2026-03-10 14:00:00+01', 'sha256:d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
 '2026-02-01 10:00:00+01', '2026-03-10 14:00:00+01'),

('e0000001-0000-4000-b000-000000000007',
 'a0000001-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000001',
 'Privacy Policy & Consent Documentation',
 'Current privacy notices, cookie consent configurations, data processing agreements with third parties, and staff privacy training records.',
 'submitted', '{}',
 'e712da03-d912-0288-98e7-7907f066d7cd', '90377934-1644-8547-b018-c4bb2449aaef',
 NULL, NULL,
 '2026-02-10 10:00:00+01', '2026-03-18 10:00:00+01');

-- Evidence for Audit 7 (ITSM — in_progress)
INSERT INTO evidence_collections (id, audit_id, tenant_id, title, description, status, evidence_item_ids, collector_id, reviewer_id, approved_at, checksum, created_at, updated_at) VALUES
('e0000001-0000-4000-b000-000000000008',
 'a0000001-0000-4000-b000-000000000007', '00000000-0000-0000-0000-000000000001',
 'Incident & Problem Management Reports',
 'Monthly incident summary reports, P1/P2 incident details, problem management records, and root cause analysis documents.',
 'collecting', '{}',
 'f3947e51-26fa-f488-4a13-e65c608d2e7b', NULL,
 NULL, NULL,
 '2026-03-10 10:00:00+01', '2026-03-25 10:00:00+01'),

('e0000001-0000-4000-b000-000000000009',
 'a0000001-0000-4000-b000-000000000007', '00000000-0000-0000-0000-000000000001',
 'Change Management Board Minutes & Logs',
 'CAB meeting minutes, change request forms, post-implementation reviews, and emergency change records.',
 'pending', '{}',
 NULL, NULL,
 NULL, NULL,
 '2026-03-12 10:00:00+01', '2026-03-12 10:00:00+01');

-- Evidence for Audit 8 (BC/DR — completed)
INSERT INTO evidence_collections (id, audit_id, tenant_id, title, description, status, evidence_item_ids, collector_id, reviewer_id, approved_at, checksum, created_at, updated_at) VALUES
('e0000001-0000-4000-b000-000000000010',
 'a0000001-0000-4000-b000-000000000008', '00000000-0000-0000-0000-000000000001',
 'DR Test Execution & Results',
 'Full DR failover test scripts, execution logs, RTO/RPO measurements, and post-test remediation actions.',
 'approved', '{}',
 'c59b492e-b071-8565-6194-633cad81d471', 'b57c7521-672f-307c-9878-e3504b0e18d7',
 '2025-12-18 14:00:00+01', 'sha256:e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
 '2025-11-15 10:00:00+01', '2025-12-18 14:00:00+01'),

('e0000001-0000-4000-b000-000000000011',
 'a0000001-0000-4000-b000-000000000008', '00000000-0000-0000-0000-000000000001',
 'Business Impact Analysis Documents',
 'BIA worksheets for all critical IT services, recovery priority classifications, and dependency mapping.',
 'approved', '{}',
 'c59b492e-b071-8565-6194-633cad81d471', 'b57c7521-672f-307c-9878-e3504b0e18d7',
 '2025-12-15 10:00:00+01', 'sha256:f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7',
 '2025-11-10 10:00:00+01', '2025-12-15 10:00:00+01');


-- +goose Down
DELETE FROM evidence_collections WHERE id IN (
    'e0000001-0000-4000-b000-000000000001', 'e0000001-0000-4000-b000-000000000002',
    'e0000001-0000-4000-b000-000000000003', 'e0000001-0000-4000-b000-000000000004',
    'e0000001-0000-4000-b000-000000000005', 'e0000001-0000-4000-b000-000000000006',
    'e0000001-0000-4000-b000-000000000007', 'e0000001-0000-4000-b000-000000000008',
    'e0000001-0000-4000-b000-000000000009', 'e0000001-0000-4000-b000-000000000010',
    'e0000001-0000-4000-b000-000000000011'
);

DELETE FROM audit_findings WHERE id IN (
    'f0000001-0000-4000-b000-000000000001', 'f0000001-0000-4000-b000-000000000002',
    'f0000001-0000-4000-b000-000000000003', 'f0000001-0000-4000-b000-000000000004',
    'f0000001-0000-4000-b000-000000000005', 'f0000001-0000-4000-b000-000000000006',
    'f0000001-0000-4000-b000-000000000007', 'f0000001-0000-4000-b000-000000000008',
    'f0000001-0000-4000-b000-000000000009', 'f0000001-0000-4000-b000-000000000010',
    'f0000001-0000-4000-b000-000000000011', 'f0000001-0000-4000-b000-000000000012',
    'f0000001-0000-4000-b000-000000000013'
);

DELETE FROM grc_audits WHERE id IN (
    'a0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000002',
    'a0000001-0000-4000-b000-000000000003', 'a0000001-0000-4000-b000-000000000004',
    'a0000001-0000-4000-b000-000000000005', 'a0000001-0000-4000-b000-000000000006',
    'a0000001-0000-4000-b000-000000000007', 'a0000001-0000-4000-b000-000000000008'
);

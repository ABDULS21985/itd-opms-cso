-- +goose Up

-- ══════════════════════════════════════════════════════════════
-- 20 IT & Application Management Policies for ITD
-- Categories: security, operational, compliance, hr
-- Statuses: mix of published, approved, in_review, draft
-- tenant_id  = 00000000-0000-0000-0000-000000000001 (ITD)
-- created_by = 20000000-0000-0000-0000-000000000001 (System Admin)
-- owner_id   = distributed among real ITD staff
-- ══════════════════════════════════════════════════════════════

INSERT INTO policies (id, tenant_id, title, description, category, tags, status, version, content, effective_date, review_date, expiry_date, owner_id, created_by) VALUES

-- ─── Security Policies (6) ──────────────────────────────────

('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
 'Information Security Policy',
 'Establishes the overarching framework for protecting CBN information assets, systems, and data against unauthorized access, disclosure, alteration, and destruction.',
 'security', ARRAY['infosec','framework','data-protection'],
 'published', 1,
 '## 1. Purpose
This policy establishes the information security framework for the Central Bank of Nigeria Information Technology Department (ITD). It defines the principles, responsibilities, and minimum requirements for protecting CBN information assets.

## 2. Scope
This policy applies to all ITD personnel, contractors, and third parties who access, process, store, or transmit CBN information and IT resources.

## 3. Policy Statements

### 3.1 Classification
All information assets shall be classified according to their sensitivity: Public, Internal, Confidential, or Restricted.

### 3.2 Access Control
Access to information systems shall be granted on a need-to-know basis following the principle of least privilege. All access must be authorized, authenticated, and auditable.

### 3.3 Data Protection
Confidential and Restricted data must be encrypted at rest and in transit using CBN-approved cryptographic standards (AES-256 minimum).

### 3.4 Incident Response
All security incidents must be reported within 1 hour of detection to the Information Security Office and handled per the Incident Response Procedure.

### 3.5 Monitoring
All systems shall maintain audit logs retained for a minimum of 12 months. Continuous monitoring shall be implemented for critical infrastructure.

## 4. Compliance
Non-compliance may result in disciplinary action up to and including termination of employment or contract.',
 '2025-01-15', '2026-01-15', '2027-01-15',
 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
 'Application Access Control Policy',
 'Defines requirements for authentication, authorization, and access management across all CBN applications and services.',
 'security', ARRAY['access-control','authentication','authorization','IAM'],
 'published', 1,
 '## 1. Purpose
Define mandatory access control requirements for all applications managed by ITD to prevent unauthorized access and ensure accountability.

## 2. Scope
All internally developed and third-party applications deployed within the CBN IT environment.

## 3. Policy Statements

### 3.1 Authentication
- Multi-factor authentication (MFA) is mandatory for all production applications.
- Service accounts must use certificate-based or API key authentication with automated rotation every 90 days.
- Password complexity: minimum 12 characters, mixed case, numbers, and special characters.

### 3.2 Authorization
- Role-Based Access Control (RBAC) must be implemented in all applications.
- Access reviews must be conducted quarterly by application owners.
- Privileged access requires separate approval and time-limited elevation.

### 3.3 Session Management
- Session timeout: 15 minutes for critical applications, 30 minutes for standard applications.
- Concurrent session limits shall be enforced per user role.

### 3.4 Deprovisioning
- Access must be revoked within 4 hours of employee separation.
- Quarterly reconciliation of active accounts against HR records is mandatory.',
 '2025-02-01', '2026-02-01', '2027-02-01',
 '961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
 'Vulnerability Management Policy',
 'Establishes procedures for identifying, assessing, prioritizing, and remediating vulnerabilities in IT systems and applications.',
 'security', ARRAY['vulnerability','patching','scanning','remediation'],
 'published', 1,
 '## 1. Purpose
Ensure timely identification and remediation of security vulnerabilities across all CBN IT infrastructure and applications.

## 2. Scope
All servers, workstations, network devices, applications, and cloud services managed by ITD.

## 3. Policy Statements

### 3.1 Scanning
- Automated vulnerability scans must be performed weekly on all production systems.
- Application security testing (SAST/DAST) must be conducted before every production release.
- Penetration testing must be performed annually by an independent third party.

### 3.2 Remediation Timelines
| Severity | Remediation SLA |
|----------|----------------|
| Critical | 24 hours |
| High | 7 days |
| Medium | 30 days |
| Low | 90 days |

### 3.3 Patch Management
- Security patches for critical vulnerabilities must be tested and deployed within 48 hours.
- Regular patching windows: every second Saturday, 22:00-06:00 WAT.
- Emergency patches may be deployed outside maintenance windows with CISO approval.

### 3.4 Exceptions
Vulnerability remediation exceptions require documented risk acceptance signed by the Division Head and CISO.',
 '2025-03-01', '2026-03-01', '2027-03-01',
 '9989e917-eb2a-43d9-b410-00b3b00c658d', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
 'Data Encryption and Key Management Policy',
 'Specifies requirements for cryptographic protection of data and the management of encryption keys throughout their lifecycle.',
 'security', ARRAY['encryption','cryptography','key-management','data-protection'],
 'approved', 1,
 '## 1. Purpose
Define the encryption standards and key management practices required to protect sensitive CBN data at rest, in transit, and during processing.

## 2. Scope
All systems that store, process, or transmit Confidential or Restricted data.

## 3. Policy Statements

### 3.1 Encryption Standards
- Data at rest: AES-256 or equivalent.
- Data in transit: TLS 1.2 minimum (TLS 1.3 preferred).
- Database encryption: Transparent Data Encryption (TDE) for all databases containing PII or financial data.

### 3.2 Key Management
- Encryption keys must be stored in a Hardware Security Module (HSM) or approved key management service.
- Key rotation: annually for symmetric keys, biennially for asymmetric keys.
- Key access must follow dual-control and split-knowledge principles.
- Destroyed keys must be overwritten using approved sanitization methods.

### 3.3 Certificate Management
- All SSL/TLS certificates must be inventoried and monitored for expiration.
- Certificate renewal must be initiated at least 30 days before expiry.
- Self-signed certificates are prohibited in production environments.',
 '2025-04-01', '2026-04-01', '2027-04-01',
 '961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
 'Network Security and Segmentation Policy',
 'Defines the requirements for securing network infrastructure, implementing segmentation, and controlling traffic flows.',
 'security', ARRAY['network','firewall','segmentation','zero-trust'],
 'approved', 1,
 '## 1. Purpose
Establish network security controls that protect CBN infrastructure from lateral movement, unauthorized access, and data exfiltration.

## 2. Scope
All LAN, WAN, wireless, and cloud network infrastructure managed by ITD.

## 3. Policy Statements

### 3.1 Network Segmentation
- Production, development, and corporate networks must be physically or logically segmented.
- Payment processing systems must reside in a dedicated, PCI-compliant network zone.
- Guest and IoT devices must be isolated on separate VLANs with no access to internal resources.

### 3.2 Firewall Rules
- Default-deny policy: all traffic not explicitly permitted is denied.
- Firewall rules must be reviewed quarterly and stale rules removed.
- All rule changes require change request approval.

### 3.3 Remote Access
- VPN with MFA is mandatory for all remote access.
- Split tunneling is prohibited on CBN-managed devices.
- Remote desktop access to production servers requires jump-box traversal with session recording.',
 '2025-03-15', '2026-03-15', '2027-03-15',
 '9989e917-eb2a-43d9-b410-00b3b00c658d', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
 'Secure Software Development Lifecycle Policy',
 'Mandates security practices throughout the software development lifecycle for all applications developed or maintained by ITD.',
 'security', ARRAY['SDLC','secure-coding','DevSecOps','application-security'],
 'in_review', 1,
 '## 1. Purpose
Integrate security into every phase of software development to reduce vulnerabilities and ensure applications meet CBN security standards before deployment.

## 2. Scope
All software developed, maintained, or commissioned by ITD, including in-house applications, vendor-customized solutions, and APIs.

## 3. Policy Statements

### 3.1 Secure Design
- Threat modeling must be performed during the design phase of all new applications and major features.
- Security requirements must be documented alongside functional requirements.

### 3.2 Secure Coding
- Developers must complete secure coding training annually.
- OWASP Top 10 vulnerabilities must be addressed in all web applications.
- Input validation, output encoding, and parameterized queries are mandatory.

### 3.3 Code Review and Testing
- All code must undergo peer review before merge to main branches.
- Static Application Security Testing (SAST) must run in the CI/CD pipeline.
- Dynamic Application Security Testing (DAST) must be performed in staging environments.
- Third-party dependencies must be scanned for known vulnerabilities (SCA).

### 3.4 Deployment
- Production deployments require security sign-off for applications handling Confidential data.
- Secrets must never be committed to source code repositories.',
 '2025-05-01', '2026-05-01', '2027-05-01',
 'f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', '20000000-0000-0000-0000-000000000001'),

-- ─── Operational Policies (7) ──────────────────────────────

('a0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
 'Change Management Policy',
 'Defines the process for planning, approving, implementing, and reviewing changes to IT systems and applications to minimize disruption.',
 'operational', ARRAY['change-management','ITIL','CAB','release'],
 'published', 1,
 '## 1. Purpose
Ensure all changes to production IT systems are planned, assessed, approved, and documented to minimize service disruption and maintain system integrity.

## 2. Scope
All changes to production infrastructure, applications, databases, network configurations, and cloud services.

## 3. Policy Statements

### 3.1 Change Categories
- **Standard**: Pre-approved, low-risk changes following established procedures.
- **Normal**: Changes requiring Change Advisory Board (CAB) review and approval.
- **Emergency**: Critical changes required to restore service; retrospective CAB review within 48 hours.

### 3.2 Change Request Process
1. Requestor submits RFC with impact assessment, rollback plan, and test evidence.
2. Change Manager performs initial triage and risk classification.
3. CAB reviews and approves/rejects normal changes (weekly meetings, Wednesdays 10:00 WAT).
4. Implementation within approved maintenance window.
5. Post-implementation review within 5 business days.

### 3.3 Maintenance Windows
- Standard: Saturdays 22:00-06:00 WAT
- Extended: Last Saturday of each quarter (full weekend)
- Blackout periods: Last two weeks of each quarter (financial reporting)

### 3.4 Rollback
Every change must have a documented and tested rollback plan. Changes without rollback plans will not be approved.',
 '2025-01-01', '2026-01-01', '2027-01-01',
 'e23bb508-44bb-4ea4-b75a-e4114b526ce8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
 'Incident Management Policy',
 'Establishes the framework for detecting, responding to, resolving, and learning from IT incidents affecting CBN services.',
 'operational', ARRAY['incident','ITIL','escalation','service-desk'],
 'published', 1,
 '## 1. Purpose
Define a structured approach to incident management that minimizes business impact and ensures rapid restoration of normal service operations.

## 2. Scope
All incidents affecting IT services delivered by ITD to CBN departments.

## 3. Policy Statements

### 3.1 Incident Classification
| Priority | Response SLA | Resolution SLA | Description |
|----------|-------------|----------------|-------------|
| P1 - Critical | 15 min | 4 hours | Complete service outage or data breach |
| P2 - High | 30 min | 8 hours | Major feature unavailable, workaround exists |
| P3 - Medium | 2 hours | 24 hours | Minor feature impacted |
| P4 - Low | 4 hours | 72 hours | Cosmetic or informational |

### 3.2 Escalation
- P1 incidents automatically escalate to Division Head after 2 hours.
- P1/P2 incidents require bridge call with all resolver groups within 30 minutes.
- Unresolved incidents exceeding SLA escalate to ITD Director.

### 3.3 Communication
- Stakeholder notifications within 15 minutes of P1/P2 declaration.
- Status updates every 30 minutes for P1, every 2 hours for P2.
- Resolution notification with RCA timeline within 1 hour of resolution.

### 3.4 Post-Incident Review
- Blameless post-mortem required within 5 business days of P1/P2 resolution.
- Action items tracked to completion with named owners and deadlines.',
 '2025-01-01', '2026-01-01', '2027-01-01',
 '9989e917-eb2a-43d9-b410-00b3b00c658d', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
 'Application Lifecycle Management Policy',
 'Governs the end-to-end lifecycle of applications from inception through retirement, including portfolio rationalization.',
 'operational', ARRAY['ALM','lifecycle','retirement','portfolio'],
 'published', 1,
 '## 1. Purpose
Ensure applications are managed systematically throughout their lifecycle, from initial development through to decommissioning, maintaining alignment with business objectives.

## 2. Scope
All applications in the ITD portfolio, including custom-developed, COTS, SaaS, and legacy systems.

## 3. Policy Statements

### 3.1 Application Portfolio
- All applications must be registered in the CMDB with current ownership, classification, and lifecycle status.
- Annual portfolio review to identify redundant, obsolete, or underutilized applications.

### 3.2 Lifecycle Stages
1. **Concept**: Business case and feasibility assessment
2. **Development**: Following SDLC policy standards
3. **Deployment**: Production readiness review required
4. **Operations**: Ongoing monitoring, patching, and support
5. **Enhancement**: Feature additions through change management
6. **Retirement**: Planned decommissioning with data archival

### 3.3 Retirement Criteria
Applications must be evaluated for retirement when:
- No active users for 6+ months
- Technology stack reaches end-of-life
- Functionality replaced by another application
- Total cost of ownership exceeds replacement cost

### 3.4 Data Archival
Data from retired applications must be archived per the Data Retention Policy before decommissioning.',
 '2025-02-15', '2026-02-15', '2027-02-15',
 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
 'Backup and Recovery Policy',
 'Defines requirements for data backup, retention, and recovery procedures to ensure business continuity.',
 'operational', ARRAY['backup','disaster-recovery','BCP','data-retention'],
 'published', 1,
 '## 1. Purpose
Ensure all critical data and systems can be recovered within defined timeframes following data loss, corruption, or disaster.

## 2. Scope
All production databases, file systems, application configurations, and infrastructure-as-code repositories.

## 3. Policy Statements

### 3.1 Backup Requirements
| Tier | RPO | RTO | Backup Frequency | Retention |
|------|-----|-----|-----------------|-----------|
| Tier 1 (Critical) | 1 hour | 4 hours | Hourly + daily full | 90 days |
| Tier 2 (Important) | 4 hours | 8 hours | Every 4 hours + daily full | 60 days |
| Tier 3 (Standard) | 24 hours | 24 hours | Daily full | 30 days |

### 3.2 Backup Storage
- Backups must be stored in geographically separate locations (minimum 100km apart).
- Backup media must be encrypted using AES-256.
- Cloud backups must reside within approved regions per data sovereignty requirements.

### 3.3 Recovery Testing
- Tier 1 recovery tests: monthly
- Tier 2 recovery tests: quarterly
- Full disaster recovery exercise: annually
- Test results must be documented and remediation items tracked.

### 3.4 Immutable Backups
Critical system backups must be stored in immutable storage for a minimum of 30 days to protect against ransomware.',
 '2025-01-15', '2026-01-15', '2027-01-15',
 'e23bb508-44bb-4ea4-b75a-e4114b526ce8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
 'IT Service Level Management Policy',
 'Defines the framework for establishing, monitoring, and reporting on IT service levels and associated agreements.',
 'operational', ARRAY['SLA','SLO','service-management','ITIL'],
 'approved', 1,
 '## 1. Purpose
Ensure IT services are delivered at agreed quality levels through formal service level agreements, continuous monitoring, and regular review.

## 2. Scope
All IT services provided by ITD to CBN departments and external stakeholders.

## 3. Policy Statements

### 3.1 Service Level Agreements
- All production services must have documented SLAs reviewed annually.
- SLAs must define: availability targets, performance thresholds, support hours, escalation paths, and penalty/credit mechanisms.

### 3.2 Availability Targets
| Service Tier | Availability | Max Planned Downtime/Month |
|-------------|-------------|---------------------------|
| Platinum | 99.99% | 4.3 minutes |
| Gold | 99.95% | 21.6 minutes |
| Silver | 99.9% | 43.2 minutes |
| Bronze | 99.5% | 3.6 hours |

### 3.3 Monitoring and Reporting
- Real-time dashboards for all SLA metrics must be maintained.
- Monthly SLA compliance reports distributed to service owners and stakeholders.
- SLA breaches must trigger immediate notification and root cause analysis.

### 3.4 Continuous Improvement
- Quarterly service review meetings with key stakeholders.
- Underperforming services must have improvement plans within 10 business days of review.',
 '2025-04-01', '2026-04-01', '2027-04-01',
 'e23bb508-44bb-4ea4-b75a-e4114b526ce8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
 'Capacity and Performance Management Policy',
 'Establishes requirements for monitoring, planning, and optimizing IT resource capacity to meet current and future demand.',
 'operational', ARRAY['capacity','performance','scaling','monitoring'],
 'in_review', 1,
 '## 1. Purpose
Ensure IT infrastructure and application resources are sufficient to meet current service levels and anticipated growth, preventing performance degradation.

## 2. Scope
All production servers, databases, storage systems, network bandwidth, and cloud resources.

## 3. Policy Statements

### 3.1 Capacity Monitoring
- CPU, memory, storage, and network utilization must be monitored continuously.
- Alert thresholds: Warning at 70%, Critical at 85% utilization.
- Capacity trends must be reviewed monthly with 12-month forecasting.

### 3.2 Performance Baselines
- Performance baselines must be established for all critical applications.
- Deviations exceeding 20% from baseline must trigger investigation.
- Application response time targets: < 2 seconds for interactive transactions.

### 3.3 Capacity Planning
- Annual capacity plans aligned with business growth projections.
- Infrastructure procurement lead time: minimum 3 months for on-premise, 2 weeks for cloud.
- Auto-scaling policies must be defined for cloud-hosted services.

### 3.4 Right-Sizing
- Quarterly review of resource allocation to identify over-provisioned and under-utilized resources.
- Cloud cost optimization reviews monthly with target savings of 15% YoY.',
 '2025-06-01', '2026-06-01', '2027-06-01',
 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001',
 'Configuration Management and CMDB Policy',
 'Defines the requirements for maintaining an accurate configuration management database and managing configuration items.',
 'operational', ARRAY['CMDB','configuration','asset-management','ITIL'],
 'draft', 1,
 '## 1. Purpose
Maintain a single source of truth for all IT configuration items, their relationships, and current state to support effective IT service management.

## 2. Scope
All hardware, software, network devices, cloud resources, and logical components that constitute IT services.

## 3. Policy Statements

### 3.1 CMDB Scope
All production and staging environment assets must be registered as Configuration Items (CIs) including:
- Physical and virtual servers
- Network devices (switches, routers, firewalls, load balancers)
- Applications and middleware
- Databases and data stores
- Cloud subscriptions and services
- Licenses and certificates

### 3.2 Data Quality
- CI records must be updated within 24 hours of any change.
- Automated discovery tools must reconcile against CMDB weekly.
- Data quality audits quarterly with target accuracy of 98%.

### 3.3 Relationships
- CI relationships (depends-on, hosts, connects-to) must be maintained to enable impact analysis.
- Change and incident records must be linked to affected CIs.

### 3.4 Ownership
Every CI must have a designated owner responsible for maintaining its accuracy.',
 NULL, '2026-06-01', NULL,
 'f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', '20000000-0000-0000-0000-000000000001'),

-- ─── Compliance Policies (5) ──────────────────────────────

('a0000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001',
 'Data Privacy and Protection Policy',
 'Ensures CBN compliance with data protection regulations including the Nigeria Data Protection Regulation (NDPR) and internal data governance standards.',
 'compliance', ARRAY['NDPR','privacy','data-governance','PII'],
 'published', 1,
 '## 1. Purpose
Ensure the collection, processing, storage, and disposal of personal and sensitive data complies with applicable laws, regulations, and CBN internal standards.

## 2. Scope
All systems and processes that handle personal data of CBN employees, customers, stakeholders, or third parties.

## 3. Policy Statements

### 3.1 Data Collection
- Personal data shall be collected only for specified, explicit, and legitimate purposes.
- Data minimization: only data necessary for the stated purpose shall be collected.
- Consent must be obtained where required by NDPR.

### 3.2 Data Processing
- Processing must align with the declared purpose of collection.
- Data Protection Impact Assessments (DPIAs) required for new systems processing sensitive personal data.
- Cross-border data transfers require explicit approval from the Data Protection Officer.

### 3.3 Data Retention
- Personal data must not be retained beyond the period necessary for its purpose.
- Retention schedules must be documented per data category.
- Secure deletion using approved methods upon retention expiry.

### 3.4 Data Subject Rights
- Processes must exist to handle data subject access requests (DSARs) within 30 days.
- Right to rectification, erasure, and portability must be supported by all systems handling PII.

### 3.5 Breach Notification
- Data breaches involving personal data must be reported to NITDA within 72 hours.
- Affected data subjects must be notified without undue delay.',
 '2025-01-01', '2026-01-01', '2027-01-01',
 '961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001',
 'IT Audit and Compliance Policy',
 'Defines the framework for conducting IT audits, maintaining compliance evidence, and managing audit findings.',
 'compliance', ARRAY['audit','compliance','controls','evidence'],
 'published', 1,
 '## 1. Purpose
Establish a systematic approach to IT auditing that ensures controls are effective, compliance is maintained, and findings are remediated in a timely manner.

## 2. Scope
All IT systems, processes, and controls within ITD, including outsourced services.

## 3. Policy Statements

### 3.1 Audit Program
- Annual IT audit plan covering all critical systems and processes.
- Risk-based audit prioritization aligned with the IT risk register.
- External audits conducted by CBN Internal Audit or approved third parties.

### 3.2 Compliance Evidence
- All control activities must maintain evidence of execution.
- Evidence must be readily retrievable for a minimum of 5 years.
- Automated evidence collection preferred over manual processes.

### 3.3 Findings Management
| Finding Severity | Remediation SLA |
|-----------------|----------------|
| Critical | 30 days |
| High | 60 days |
| Medium | 90 days |
| Low | 180 days |

### 3.4 Continuous Compliance
- Key controls must be monitored continuously where technically feasible.
- Monthly compliance dashboards for Division Heads.
- Quarterly compliance reports to ITD Director and CBN Board IT Committee.',
 '2025-02-01', '2026-02-01', '2027-02-01',
 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001',
 'Third-Party and Vendor Management Policy',
 'Governs the selection, assessment, monitoring, and offboarding of third-party IT vendors and service providers.',
 'compliance', ARRAY['vendor','third-party','procurement','due-diligence'],
 'approved', 1,
 '## 1. Purpose
Ensure that third-party vendors and service providers meet CBN security, compliance, and operational requirements, and that associated risks are effectively managed.

## 2. Scope
All third parties that develop, host, manage, or access CBN IT systems, data, or infrastructure.

## 3. Policy Statements

### 3.1 Vendor Assessment
- Security and compliance due diligence required before contract execution.
- Risk classification: Critical, High, Medium, Low based on data access and service criticality.
- SOC 2 Type II or equivalent assurance required for Critical and High vendors.

### 3.2 Contractual Requirements
- Security requirements and SLAs must be included in all vendor contracts.
- Right to audit clause mandatory for Critical and High vendors.
- Data processing agreements required where vendor accesses personal data.
- Clear data return and destruction obligations upon contract termination.

### 3.3 Ongoing Monitoring
- Annual security reassessment for Critical vendors.
- Biennial reassessment for High vendors.
- Performance monitoring against contractual SLAs monthly.

### 3.4 Offboarding
- Vendor access revocation within 24 hours of contract termination.
- Confirmation of data return/destruction within 30 days.
- Transition plan required minimum 90 days before contract end.',
 '2025-03-01', '2026-03-01', '2027-03-01',
 '961b78e7-776e-4fcd-a728-eb9d1ebe4c12', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001',
 'Software License Compliance Policy',
 'Ensures all software used within CBN is properly licensed and that license usage is tracked and optimized.',
 'compliance', ARRAY['licensing','software-asset','compliance','SAM'],
 'approved', 1,
 '## 1. Purpose
Maintain full compliance with software license agreements, prevent unauthorized software usage, and optimize license spending.

## 2. Scope
All software installed on CBN-managed devices, servers, and cloud environments.

## 3. Policy Statements

### 3.1 License Inventory
- All software licenses must be recorded in the Software Asset Management (SAM) system.
- License entitlements must be reconciled against deployed installations quarterly.
- Shadow IT software discovery scans must be conducted monthly.

### 3.2 Procurement
- All software procurement must go through the IT Procurement process.
- License type evaluation (perpetual vs. subscription, per-user vs. per-device) required in business case.
- Bulk and enterprise agreement opportunities must be evaluated annually.

### 3.3 Usage Monitoring
- License utilization metrics must be tracked for all enterprise applications.
- Licenses with < 50% utilization flagged for reallocation or termination.
- True-up requirements tracked 90 days before annual renewal.

### 3.4 Prohibited Software
- Unauthorized software installation is prohibited on CBN-managed devices.
- Application whitelisting enforced on all production servers.
- Personal software on corporate devices requires explicit IT approval.',
 '2025-04-15', '2026-04-15', '2027-04-15',
 'f5a88cd6-99c8-4bce-8bb0-4eb75ec3df49', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001',
 'IT Risk Management Policy',
 'Defines the methodology for identifying, assessing, treating, and monitoring IT-related risks across the organization.',
 'compliance', ARRAY['risk','GRC','risk-register','risk-treatment'],
 'in_review', 1,
 '## 1. Purpose
Establish a structured approach to IT risk management that aligns with CBN enterprise risk framework and ensures informed decision-making.

## 2. Scope
All IT-related risks across infrastructure, applications, data, personnel, and third parties.

## 3. Policy Statements

### 3.1 Risk Identification
- Annual comprehensive IT risk assessment.
- Continuous risk identification through incident analysis, audit findings, and threat intelligence.
- All staff must report potential risks through the risk management portal.

### 3.2 Risk Assessment
- Risks assessed on likelihood (1-5) and impact (1-5) dimensions.
- Risk rating: Critical (20-25), High (15-19), Medium (8-14), Low (1-7).
- Impact assessment must consider financial, operational, reputational, and regulatory dimensions.

### 3.3 Risk Treatment
- **Mitigate**: Implement controls to reduce likelihood or impact.
- **Transfer**: Insurance or contractual risk transfer.
- **Accept**: Formal acceptance by authorized risk owner (Division Head for High, ITD Director for Critical).
- **Avoid**: Discontinue the risk-generating activity.

### 3.4 Risk Monitoring
- Risk register reviewed monthly by Division Heads.
- Key Risk Indicators (KRIs) monitored continuously with automated alerting.
- Quarterly risk report to ITD Director and Board IT Committee.',
 '2025-07-01', '2026-07-01', '2027-07-01',
 'f0896cd0-10a3-4eb6-8727-fbc2913a26d8', '20000000-0000-0000-0000-000000000001'),

-- ─── HR / People Policies (2) ──────────────────────────────

('a0000001-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001',
 'IT Staff Acceptable Use Policy',
 'Defines acceptable and prohibited uses of CBN IT resources by all personnel with access to information systems.',
 'hr', ARRAY['acceptable-use','AUP','employee','conduct'],
 'published', 1,
 '## 1. Purpose
Define the acceptable use of CBN IT resources to protect the organization, its employees, and its stakeholders while enabling productivity.

## 2. Scope
All persons granted access to CBN IT resources, including employees, contractors, vendors, and temporary staff.

## 3. Policy Statements

### 3.1 Acceptable Use
- CBN IT resources are provided primarily for business purposes.
- Limited personal use is permitted provided it does not interfere with work duties, consume excessive resources, or violate any policy.

### 3.2 Prohibited Activities
- Unauthorized access or attempted access to systems, data, or networks.
- Installation of unauthorized software or hardware.
- Transmission of malicious code, spam, or phishing content.
- Use of CBN resources for personal commercial activities.
- Bypassing security controls (proxies, firewalls, DLP systems).
- Sharing credentials or authentication tokens.

### 3.3 Monitoring
- CBN reserves the right to monitor all use of IT resources.
- Email, internet activity, and file access may be logged and reviewed.
- Users should have no expectation of privacy when using CBN systems.

### 3.4 BYOD
- Personal devices accessing CBN data must comply with the Mobile Device Management (MDM) policy.
- CBN data must not be stored on unmanaged personal devices.',
 '2025-01-01', '2026-01-01', '2027-01-01',
 '9989e917-eb2a-43d9-b410-00b3b00c658d', '20000000-0000-0000-0000-000000000001'),

('a0000001-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'IT Training and Certification Policy',
 'Establishes requirements for continuous professional development, certifications, and skills management for IT personnel.',
 'hr', ARRAY['training','certification','skills','professional-development'],
 'draft', 1,
 '## 1. Purpose
Ensure ITD staff maintain current technical skills, industry certifications, and security awareness to deliver high-quality IT services.

## 2. Scope
All permanent ITD staff and long-term contractors (engagement > 6 months).

## 3. Policy Statements

### 3.1 Mandatory Training
- Security awareness training: annual completion required for all staff.
- Role-specific training: completed within 90 days of role assignment.
- New technology training: completed before production deployment of new platforms.

### 3.2 Certification Requirements
| Role Category | Required Certifications |
|--------------|------------------------|
| Security | CISSP, CISM, or CEH |
| Infrastructure | Cloud provider cert (AWS/Azure/GCP) |
| Development | Relevant platform certification |
| Management | ITIL Foundation + PMP or PRINCE2 |

### 3.3 Training Budget
- Minimum 40 hours of professional development per staff per year.
- Training budget allocation: 5% of division personnel costs.
- Conference attendance limited to 2 per staff per year with knowledge-sharing obligation.

### 3.4 Knowledge Transfer
- Staff returning from training must conduct knowledge-sharing sessions within 30 days.
- Training materials and certifications tracked in the HR system.
- Skills gap analysis conducted annually aligned with technology roadmap.',
 NULL, '2026-07-01', NULL,
 '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');


-- +goose Down
DELETE FROM policies WHERE id IN (
  'a0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000002',
  'a0000001-0000-0000-0000-000000000003',
  'a0000001-0000-0000-0000-000000000004',
  'a0000001-0000-0000-0000-000000000005',
  'a0000001-0000-0000-0000-000000000006',
  'a0000001-0000-0000-0000-000000000007',
  'a0000001-0000-0000-0000-000000000008',
  'a0000001-0000-0000-0000-000000000009',
  'a0000001-0000-0000-0000-000000000010',
  'a0000001-0000-0000-0000-000000000011',
  'a0000001-0000-0000-0000-000000000012',
  'a0000001-0000-0000-0000-000000000013',
  'a0000001-0000-0000-0000-000000000014',
  'a0000001-0000-0000-0000-000000000015',
  'a0000001-0000-0000-0000-000000000016',
  'a0000001-0000-0000-0000-000000000017',
  'a0000001-0000-0000-0000-000000000018',
  'a0000001-0000-0000-0000-000000000019',
  'a0000001-0000-0000-0000-000000000020'
);

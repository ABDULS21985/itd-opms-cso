
CENTRAL BANK OF NIGERIA
Information Technology Department
Application Management Division

ITD Operations & Project Management System
(ITD-OPMS)

Module Specification
Storage/Server Allocation and Additional Space Request

Attribute	Value
Document Reference	ITD-OPMS/MOD/SSA-001
Form Reference	ITD/QCMD/SCAO/SAF v1.0
Classification	INTERNAL
Version	1.0
Date	16 March 2026
Author	Digibit Solutions Limited
Approver	Director, ITD
 
Table of Contents
Table of Contents	2
1. Executive Summary	4
2. Scope and Objectives	4
2.1 In Scope	4
2.2 Out of Scope	4
2.3 Objectives	5
3. Data Model	6
3.1 Entity: ssa_request (Server/Storage Allocation Request)	6
3.2 Entity: ssa_service_impact	7
3.3 Entity: ssa_approval	7
3.4 Entity: ssa_asd_assessment	8
3.5 Entity: ssa_qcmd_analysis	8
3.6 Entity: ssa_san_provisioning	9
3.7 Entity: ssa_dco_server	9
3.8 Entity: ssa_audit_log	10
3.9 Entity: ssa_delegation	10
4. Workflow States and Transitions	11
4.1 State Definitions	11
4.2 State Transition Rules	12
4.3 Rejection Handling	12
5. Form Fields Specification	14
5.1 Requestor Section	14
5.2 Technical Specification Section	14
5.3 Service Impact Analysis Section	15
5.4 Justification Section	15
6. Approval Routing Rules	16
6.1 Head of Office Endorsement	16
6.2 ASD Assessment Routing	16
6.3 QCMD Analysis Routing	16
6.4 Five-Tier Approval Chain	16
6.5 Delegation Rules	16
7. Service-Level Agreements	17
7.1 SLA Targets by Stage	17
7.2 SLA Breach Handling	17
8. Notification Rules	18
9. Role-Based Access Control	19
10. Integration Points	20
10.1 OPMS Platform Services	20
10.2 External Systems (Future Phases)	20
11. Dashboard Views	21
11.1 Requestor Dashboard	21
11.2 Approver Dashboard	21
11.3 Administrator Dashboard	21
12. Non-Functional Requirements	22
13. Appendices	23
Appendix A: Operating System Options	23
Appendix B: VLAN Zone Definitions	23
Appendix C: Reference Number Format	23
Appendix D: Document Control	23

 
1. Executive Summary
This document specifies the design, data model, workflow engine, approval routing, service-level agreements (SLAs), and integration requirements for the Storage/Server Allocation and Additional Space Request module within the ITD Operations and Project Management System (ITD-OPMS).
The module digitises the end-to-end lifecycle of CBN Form ITD/QCMD/SCAO/SAF v1.0, replacing a paper-based, multi-signature process with a fully auditable, role-governed digital workflow. The specification covers seven distinct processing stages — from initial requestor submission through Head-of-Office endorsement, ASD technical assessment, QCMD capacity analysis, five-tier senior management approval, SAN provisioning, and DCO server creation — producing a complete audit trail and real-time status visibility for all stakeholders.
The module is designed to operate as a self-contained functional unit within the broader OPMS platform, sharing the platform’s authentication, notification, and reporting infrastructure while maintaining its own domain-specific data model, business rules, and workflow states.
2. Scope and Objectives
2.1 In Scope
•	Digital submission of server/storage allocation requests with full specification capture
•	Structured Service Impact Analysis (SIA) capture with risk narrative fields
•	Head-of-Office endorsement workflow with delegation support
•	ASD (Application Support Division) technical feasibility assessment
•	QCMD (Quality and Configuration Management Division) capacity analysis with live inventory linkage
•	Sequential five-tier approval chain: Head Data Centre → Head SSO → Head IMD → Head ASD → Head SCAO
•	Rejection routing with mandatory remarks and return-to-requestor logic
•	SAN provisioning record capture (PORT, CU, LDEV, LUN, ACP)
•	DCO server creation record (server name, IP address, VLAN zone, creator)
•	Full audit trail with immutable state transition logging
•	SLA enforcement with escalation triggers at each workflow stage
•	Role-based access control aligned to CBN ITD organisational structure
•	Dashboard views for requestors, approvers, and administrators
•	Reporting and analytics for infrastructure demand forecasting
2.2 Out of Scope
•	Physical SAN switch configuration or automated VM provisioning via hypervisor APIs (manual post-approval)
•	Billing or chargeback calculation for allocated resources
•	Integration with external cloud providers
2.3 Objectives
#	Objective	Success Measure
O1	Eliminate paper-based form routing across five approval tiers	100% digital workflow adoption within 90 days of deployment
O2	Reduce average request-to-provisioning cycle time	From estimated 10–15 working days to 5 working days or fewer
O3	Provide real-time visibility into request status	All stakeholders can view live status at any time via dashboard
O4	Enforce governance and SLA compliance	Zero requests bypassing the defined approval chain
O5	Maintain complete audit trail for regulatory readiness	Every state transition, approval, and rejection logged with timestamp and actor
O6	Enable data-driven infrastructure capacity planning	Monthly analytics on request volume, resource types, utilisation trends
 
3. Data Model
The module’s data model comprises six core entities and three supporting entities. All entities inherit the platform’s standard audit columns (created_by, created_at, updated_by, updated_at, is_deleted).
3.1 Entity: ssa_request (Server/Storage Allocation Request)
The primary entity capturing the full request payload as submitted by the requestor.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
reference_no	VARCHAR(30)	No	Auto-generated: SSA-YYYY-NNNNN
requestor_id	UUID (FK)	No	FK to platform users table
requestor_name	VARCHAR(150)	No	Full name (denormalised for audit)
requestor_staff_id	VARCHAR(20)	No	CBN staff ID (e.g., 28264)
requestor_email	VARCHAR(150)	No	CBN email address
division_office	VARCHAR(100)	No	Division/Office (e.g., AMD/CS)
status	VARCHAR(30)	No	See workflow states (Section 4)
extension	VARCHAR(20)	Yes	Phone extension
app_name	VARCHAR(200)	No	Application name (e.g., ITD-OPMS)
db_name	VARCHAR(100)	No	Database engine (e.g., PostgreSQL)
operating_system	VARCHAR(100)	No	Target OS
server_type	VARCHAR(50)	No	DB, APP, WEB, or combination
vcpu_count	INTEGER	No	Number of vCPUs requested
memory_gb	INTEGER	No	RAM in gigabytes
disk_count	INTEGER	Yes	Number of disks required
space_gb	INTEGER	No	Storage space in GB
vlan_zone	VARCHAR(200)	No	VLAN zone description
special_requirements	TEXT	Yes	HA, clustering, failover notes
justification	TEXT	No	Business justification narrative
present_space_allocated_gb	INTEGER	No	Currently allocated space (0 for new)
present_space_in_use_gb	INTEGER	No	Currently used space (0 for new)
submitted_at	TIMESTAMPTZ	Yes	Timestamp of initial submission
completed_at	TIMESTAMPTZ	Yes	Timestamp of final provisioning
 
3.2 Entity: ssa_service_impact
Captures structured risk narratives for the Service Impact Analysis. Each request may have multiple SIA entries.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
request_id	UUID (FK)	No	FK to ssa_request
risk_category	VARCHAR(50)	No	AUTHENTICATION, AVAILABILITY, PERFORMANCE, DATA_INTEGRITY
risk_description	TEXT	No	Narrative describing the risk scenario
mitigation_measures	TEXT	No	Proposed controls and mitigations
severity	VARCHAR(20)	No	CRITICAL, HIGH, MEDIUM, LOW
sequence_order	INTEGER	No	Display order on the form
3.3 Entity: ssa_approval
Records each approval or rejection action across all stages of the workflow.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
request_id	UUID (FK)	No	FK to ssa_request
stage	VARCHAR(40)	No	Workflow stage code (see Section 4)
approver_id	UUID (FK)	No	FK to platform users table
approver_name	VARCHAR(150)	No	Full name (denormalised)
approver_role	VARCHAR(100)	No	Organisational role title
decision	VARCHAR(20)	No	APPROVED, REJECTED, RETURNED
remarks	TEXT	Yes	Mandatory on rejection; optional on approval
decided_at	TIMESTAMPTZ	No	Timestamp of the decision
delegated_from_id	UUID (FK)	Yes	If acting as delegate, FK to original approver
sla_target_at	TIMESTAMPTZ	No	SLA deadline for this stage
sla_breached	BOOLEAN	No	Whether decision exceeded SLA window
 
3.4 Entity: ssa_asd_assessment
Technical feasibility assessment completed by ASD.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
request_id	UUID (FK)	No	FK to ssa_request (one-to-one)
assessor_id	UUID (FK)	No	FK to platform users table
assessment_outcome	VARCHAR(20)	No	FEASIBLE, CONDITIONALLY_FEASIBLE, NOT_FEASIBLE
os_compatibility_check	BOOLEAN	No	OS confirmed supported
resource_adequacy_check	BOOLEAN	No	Resources within capacity envelope
security_compliance_check	BOOLEAN	No	Security posture verified
ha_feasibility_check	BOOLEAN	No	HA config technically achievable
conditions	TEXT	Yes	Conditions for CONDITIONALLY_FEASIBLE
technical_notes	TEXT	Yes	Free-form technical commentary
assessed_at	TIMESTAMPTZ	No	Timestamp of assessment completion
3.5 Entity: ssa_qcmd_analysis
QCMD capacity analysis and server assignment. Linked to the SAN inventory.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
request_id	UUID (FK)	No	FK to ssa_request (one-to-one)
analyst_id	UUID (FK)	No	FK to platform users table
server_reference	VARCHAR(50)	No	Target server ID (e.g., ABJNX02)
available_storage_tb	DECIMAL(10,2)	No	Available capacity before allocation
space_requested_gb	INTEGER	No	Echoed from request for audit
storage_after_allocation_tb	DECIMAL(10,2)	No	Remaining capacity post-allocation
justification_notes	TEXT	Yes	QCMD justification for server selection
analysed_at	TIMESTAMPTZ	No	Timestamp of analysis completion
 
3.6 Entity: ssa_san_provisioning
SAN administrator provisioning record capturing all storage-area network parameters.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
request_id	UUID (FK)	No	FK to ssa_request (one-to-one)
administrator_id	UUID (FK)	No	FK to platform users table
port	VARCHAR(30)	No	SAN port identifier
cu	VARCHAR(30)	No	Control Unit reference
ldev	VARCHAR(30)	No	Logical Device number
lun	VARCHAR(30)	No	Logical Unit Number
acp	VARCHAR(30)	No	Access Control Path
size_allocated	VARCHAR(30)	No	Actual size allocated
hba_type	VARCHAR(100)	Yes	Host Bus Adapter type
hba_driver_version	VARCHAR(50)	Yes	HBA driver version
wwn_no	VARCHAR(50)	Yes	World Wide Name
host_name	VARCHAR(100)	Yes	Host name assigned
san_switch_no_port	VARCHAR(100)	Yes	SAN switch number and port
san_switch_zone_name	VARCHAR(100)	Yes	SAN switch zone name
remarks	TEXT	Yes	Provisioning notes
provisioned_at	TIMESTAMPTZ	No	Timestamp of SAN provisioning
3.7 Entity: ssa_dco_server
Data Centre Operations server creation record.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
request_id	UUID (FK)	No	FK to ssa_request (one-to-one)
creator_id	UUID (FK)	No	FK to platform users table
creator_name	VARCHAR(150)	No	Name (denormalised)
creator_staff_id	VARCHAR(20)	No	CBN staff ID
server_name	VARCHAR(100)	No	Assigned server name
ip_address	VARCHAR(45)	No	Assigned IP address (IPv4 or IPv6)
zone	VARCHAR(100)	No	Network zone designation
created_server_at	TIMESTAMPTZ	No	Timestamp of server creation
 
3.8 Entity: ssa_audit_log
Immutable audit trail recording every state transition, data change, and system event.
Column	Type	Nullable	Description
id	BIGSERIAL (PK)	No	Auto-incrementing sequence
request_id	UUID (FK)	No	FK to ssa_request
event_type	VARCHAR(50)	No	STATE_CHANGE, DATA_EDIT, NOTIFICATION, SLA_BREACH, ESCALATION
from_state	VARCHAR(30)	Yes	Previous workflow state
to_state	VARCHAR(30)	Yes	New workflow state
actor_id	UUID (FK)	No	User or system account
actor_name	VARCHAR(150)	No	Denormalised actor name
description	TEXT	No	Human-readable event description
metadata_json	JSONB	Yes	Structured event data (field changes, SLA details)
ip_address	VARCHAR(45)	Yes	Source IP of the action
occurred_at	TIMESTAMPTZ	No	Event timestamp (server clock)
3.9 Entity: ssa_delegation
Manages temporary approval delegation when a designated approver is unavailable.
Column	Type	Nullable	Description
id	UUID (PK)	No	System-generated unique identifier
delegator_id	UUID (FK)	No	Original approver
delegate_id	UUID (FK)	No	Temporary delegate
stage	VARCHAR(40)	No	Workflow stage this delegation covers
effective_from	TIMESTAMPTZ	No	Delegation start date
effective_to	TIMESTAMPTZ	No	Delegation end date
is_active	BOOLEAN	No	Active flag (system auto-expires)
reason	TEXT	Yes	Reason for delegation (leave, travel)
 
4. Workflow States and Transitions
4.1 State Definitions
State Code	Display Label	Description
DRAFT	Draft	Request created but not yet submitted. Requestor can edit all fields.
SUBMITTED	Submitted	Request submitted and locked. Awaiting Head of Office endorsement.
HOO_ENDORSED	Endorsed by Head of Office	Line manager has endorsed. Routed to ASD for technical assessment.
ASD_ASSESSED	ASD Assessment Complete	Technical feasibility confirmed. Routed to QCMD for capacity analysis.
QCMD_ANALYSED	QCMD Analysis Complete	Capacity verified, server assigned. Routed to approval chain.
APPR_DC_PENDING	Awaiting Head Data Centre	First approval tier. Sequential chain begins.
APPR_SSO_PENDING	Awaiting Head SSO	Second approval tier.
APPR_IMD_PENDING	Awaiting Head IMD	Third approval tier.
APPR_ASD_PENDING	Awaiting Head ASD	Fourth approval tier.
APPR_SCAO_PENDING	Awaiting Head SCAO	Fifth and final approval tier.
FULLY_APPROVED	Fully Approved	All five approvers have signed. Routed to SAN provisioning.
SAN_PROVISIONED	SAN Provisioned	SAN parameters recorded. Routed to DCO for server creation.
DCO_CREATED	Server Created	Server provisioned and recorded. Request complete.
REJECTED	Rejected	Rejected at any stage. Contains rejector remarks and return stage.
CANCELLED	Cancelled	Withdrawn by requestor (only from DRAFT or SUBMITTED state).
 
4.2 State Transition Rules
The following table defines every permitted state transition, the actor authorised to trigger it, and any guard conditions that must be satisfied.
From State	To State	Actor	Guard Condition
DRAFT	SUBMITTED	Requestor	All mandatory fields populated; at least one SIA entry
DRAFT	CANCELLED	Requestor	None
SUBMITTED	HOO_ENDORSED	Head of Office	Endorsement recorded
SUBMITTED	REJECTED	Head of Office	Rejection remarks mandatory
SUBMITTED	CANCELLED	Requestor	Requestor may cancel before endorsement
HOO_ENDORSED	ASD_ASSESSED	ASD Assessor	All four feasibility checks completed; outcome recorded
HOO_ENDORSED	REJECTED	ASD Assessor	Outcome = NOT_FEASIBLE; remarks mandatory
ASD_ASSESSED	QCMD_ANALYSED	QCMD Analyst	Server reference assigned; capacity figures populated
QCMD_ANALYSED	APPR_DC_PENDING	System	Automatic on QCMD completion
APPR_DC_PENDING	APPR_SSO_PENDING	Head Data Centre	Approval recorded
APPR_DC_PENDING	REJECTED	Head Data Centre	Rejection remarks mandatory
APPR_SSO_PENDING	APPR_IMD_PENDING	Head SSO	Approval recorded
APPR_SSO_PENDING	REJECTED	Head SSO	Rejection remarks mandatory
APPR_IMD_PENDING	APPR_ASD_PENDING	Head IMD	Approval recorded
APPR_IMD_PENDING	REJECTED	Head IMD	Rejection remarks mandatory
APPR_ASD_PENDING	APPR_SCAO_PENDING	Head ASD	Approval recorded
APPR_ASD_PENDING	REJECTED	Head ASD	Rejection remarks mandatory
APPR_SCAO_PENDING	FULLY_APPROVED	Head SCAO	Approval recorded
APPR_SCAO_PENDING	REJECTED	Head SCAO	Rejection remarks mandatory
FULLY_APPROVED	SAN_PROVISIONED	SAN Administrator	All SAN fields populated
SAN_PROVISIONED	DCO_CREATED	DCO Officer	Server name, IP, zone recorded
REJECTED	DRAFT	Requestor	Requestor may revise and resubmit
4.3 Rejection Handling
When a request is rejected at any stage, the following rules apply:
•	The rejecting officer must provide mandatory remarks explaining the rejection reason.
•	The request status transitions to REJECTED with a reference to the rejecting stage stored in the ssa_approval record.
•	An immediate notification is sent to the requestor and the Head of Office.
•	The requestor may revise the request (returning it to DRAFT) and resubmit. The resubmission increments a revision counter on the request and the entire approval chain restarts from the beginning.
•	All previous approval records are preserved in history and are not overwritten.
•	A request that has been rejected three times is automatically flagged for Director-level review.
 
5. Form Fields Specification
This section maps every field on the paper form (ITD/QCMD/SCAO/SAF v1.0) to the corresponding OPMS data capture element, including UI control type, validation rules, and default values.
5.1 Requestor Section
Field Label	DB Column	UI Control	Required	Validation	Default
Name	requestor_name	Auto-populated	Yes	From logged-in user profile	Session user
Div./Office	division_office	Dropdown	Yes	Must match ITD org structure	User’s division
Status	requestor_status (VARCHAR)	Dropdown	Yes	S/S, D/S, P/S, Contract	—
ID No	requestor_staff_id	Auto-populated	Yes	Numeric, from user profile	Session user
Email	requestor_email	Auto-populated	Yes	@cbn.gov.ng domain validated	Session user
Extension	extension	Text input	No	Digits only, max 10 chars	—
Date	submitted_at	Auto-generated	Yes	System timestamp on submit	Now()
5.2 Technical Specification Section
Field Label	DB Column	UI Control	Required	Validation	Default
Apps/Database Name	app_name, db_name	Two text inputs	Yes	Max 200/100 chars	—
Operating System	operating_system	Dropdown + other	Yes	Predefined list or free text	—
Server Type	server_type	Multi-select checkbox	Yes	DB, APP, WEB	—
Number of CPUs	vcpu_count	Numeric spinner	Yes	Min 1, max 256, step 1	4
Memory (GB)	memory_gb	Numeric spinner	Yes	Min 1, max 2048, step 1	8
Number of Disk	disk_count	Numeric spinner	No	Min 0, max 100	—
Space Required (GB)	space_gb	Numeric spinner	Yes	Min 10, max 100000, step 10	100
VLAN Zone	vlan_zone	Dropdown + text	Yes	Predefined zones or custom	—
Special Requirements	special_requirements	Textarea	No	Max 2000 chars	—
5.3 Service Impact Analysis Section
The SIA section is a dynamic repeater form. The requestor adds one or more risk entries, each comprising a risk category, severity, narrative description, and mitigation measures. A minimum of one SIA entry is required before submission.
Field Label	DB Column	UI Control	Required	Validation	Default
Risk Category	risk_category	Dropdown	Yes	AUTHENTICATION, AVAILABILITY, PERFORMANCE, DATA_INTEGRITY	—
Severity	severity	Dropdown	Yes	CRITICAL, HIGH, MEDIUM, LOW	—
Risk Description	risk_description	Textarea	Yes	Min 50 chars, max 3000	—
Mitigation Measures	mitigation_measures	Textarea	Yes	Min 50 chars, max 3000	—
5.4 Justification Section
Field Label	DB Column	UI Control	Required	Validation	Default
Reason for Request	justification	Rich textarea	Yes	Min 100 chars, max 5000	—
Present Space Allocated	present_space_allocated_gb	Numeric	Yes	Min 0	0
Present Space In Use	present_space_in_use_gb	Numeric	Yes	Min 0, max allocated	0
 
6. Approval Routing Rules
6.1 Head of Office Endorsement
The Head of Office is resolved dynamically from the OPMS organisational hierarchy based on the requestor’s division_office value. If the requestor’s direct report chain includes multiple levels, the endorsement routes to the immediate Head of Office (e.g., for AMD/CS, this would be the Head of the Collaboration Services Office, currently Mr. Okereke, Ugochukwu C.).
6.2 ASD Assessment Routing
ASD assessment is assigned to the ASD assessment pool. The module supports two assignment strategies configurable by the system administrator: round-robin (sequential assignment to available assessors) or manual claim (any available assessor can claim the request from the assessment queue).
6.3 QCMD Analysis Routing
QCMD analysis routes to the QCMD analyst pool. The same assignment strategies apply (round-robin or manual claim).
6.4 Five-Tier Approval Chain
The approval chain is strictly sequential and cannot be parallelised or reordered. Each tier must complete before the next tier is activated. The chain is:
1.	Head, Data Centre — validates infrastructure placement and rack capacity
2.	Head, Systems Support Office (SSO) — validates OS and systems compatibility
3.	Head, Infrastructure Management Division (IMD) — validates network and VLAN configuration
4.	Head, Application Support Division (ASD) — validates application deployment readiness
5.	Head, Server and Cloud Administration Office (SCAO) — final approval authority for server/storage allocation
6.5 Delegation Rules
•	Any designated approver may delegate their approval authority to a named delegate for a specified period.
•	Delegation must be configured in advance (not retroactive) via the ssa_delegation entity.
•	When a delegation is active, both the original approver and the delegate receive notifications; either may act.
•	All delegated approvals are flagged in the audit trail with the delegated_from_id field.
•	A delegate cannot further sub-delegate.
 
7. Service-Level Agreements
Each workflow stage has a defined SLA window measured in business hours (Monday–Friday, 08:00–17:00 WAT, excluding CBN-declared public holidays). The system calculates the SLA target timestamp at stage entry and monitors compliance in real time.
7.1 SLA Targets by Stage
Stage	SLA (Business Hours)	Escalation Trigger	Escalation Action
Head of Office Endorsement	8 hours	6 hours elapsed	Reminder to HOO + notify requestor
ASD Assessment	16 hours	12 hours elapsed	Reminder to ASD pool + notify HOO
QCMD Analysis	16 hours	12 hours elapsed	Reminder to QCMD pool + notify HOO
Head Data Centre Approval	8 hours	6 hours elapsed	Reminder + escalate to Director ITD
Head SSO Approval	8 hours	6 hours elapsed	Reminder + escalate to Director ITD
Head IMD Approval	8 hours	6 hours elapsed	Reminder + escalate to Director ITD
Head ASD Approval	8 hours	6 hours elapsed	Reminder + escalate to Director ITD
Head SCAO Approval	8 hours	6 hours elapsed	Reminder + escalate to Director ITD
SAN Provisioning	24 hours	16 hours elapsed	Reminder + escalate to Head SCAO
DCO Server Creation	24 hours	16 hours elapsed	Reminder + escalate to Head Data Centre
7.2 SLA Breach Handling
•	When an SLA target is breached, the ssa_audit_log records an SLA_BREACH event with the stage, elapsed time, and responsible actor.
•	The system sends an immediate escalation notification to the next level in the management hierarchy.
•	SLA breaches are surfaced on the module dashboard in a dedicated SLA compliance panel.
•	Monthly SLA compliance reports are auto-generated and available to the Director, ITD.
 
8. Notification Rules
The module leverages the OPMS platform’s notification engine (email and in-app). Every notification includes the request reference number, current status, action required (if any), and a deep link to the request detail page.
Event	Recipients	Channel	Timing
Request submitted	Head of Office, Requestor (confirmation)	Email + In-app	Immediate
HOO endorsement	ASD assessment pool, Requestor	Email + In-app	Immediate
HOO rejection	Requestor	Email + In-app	Immediate
ASD assessment complete	QCMD analyst pool, Requestor	Email + In-app	Immediate
QCMD analysis complete	Head Data Centre (first approver)	Email + In-app	Immediate
Each approval tier passed	Next approver in chain, Requestor	Email + In-app	Immediate
Final approval (Head SCAO)	SAN admin pool, Requestor, HOO	Email + In-app	Immediate
Rejection at any tier	Requestor, HOO	Email + In-app	Immediate
SAN provisioning complete	DCO team, Requestor	Email + In-app	Immediate
Server creation complete	Requestor, HOO, all approvers	Email + In-app	Immediate
SLA reminder (approaching)	Stage actor	Email + In-app	At escalation trigger
SLA breach	Stage actor + manager	Email + In-app	Immediate on breach
 
9. Role-Based Access Control
The module defines six functional roles. A user may hold multiple roles (e.g., an ASD assessor may also be a requestor). All role assignments are managed through the OPMS platform’s identity and access management module.
Role	Permissions	Typical Holder
SSA_REQUESTOR	Create, edit (DRAFT only), submit, cancel, view own requests, revise rejected requests	Any ITD staff member
SSA_HOO_ENDORSER	View assigned requests, endorse or reject, view all requests in own division	Head of Office (e.g., Okereke)
SSA_ASD_ASSESSOR	View assessment queue, claim requests, submit ASD assessment	ASD technical staff
SSA_QCMD_ANALYST	View analysis queue, claim requests, submit QCMD analysis, assign server reference	QCMD staff
SSA_APPROVER	View approval queue for assigned tier, approve or reject, configure delegation	Heads of DC, SSO, IMD, ASD, SCAO
SSA_SAN_ADMIN	View provisioning queue, submit SAN parameters	SAN administration team
SSA_DCO_OFFICER	View DCO queue, submit server creation details	Data Centre Operations staff
SSA_ADMIN	Configure SLA parameters, manage role assignments, view all requests, generate reports, manage delegation	OPMS system administrator
 
10. Integration Points
10.1 OPMS Platform Services
Service	Integration Type	Purpose
Authentication & IAM	Direct (shared DB)	User identity, role resolution, session management
Notification Engine	Internal API	Email and in-app notification dispatch
Organisational Hierarchy	Direct (shared DB)	Head-of-Office resolution, escalation chain lookup
Reporting Engine	Internal API	Dashboard widgets, scheduled reports, export
Audit Framework	Direct (shared DB)	Cross-module audit log aggregation
10.2 External Systems (Future Phases)
System	Integration Type	Purpose
SAN Inventory API	REST API (read)	Auto-populate available capacity, server references
VMware vCenter / Proxmox	REST API (read/write)	Automated VM provisioning (future)
CMDB	REST API (bidirectional)	Configuration item registration post-provisioning
Email Gateway (Exchange)	SMTP relay	External notification delivery
 
11. Dashboard Views
11.1 Requestor Dashboard
•	My Requests list with status badges, submitted date, current stage, and SLA countdown
•	Quick-create button for new server/storage allocation request
•	Draft requests awaiting completion
•	Rejected requests with rejector remarks and one-click revise action
11.2 Approver Dashboard
•	Pending Approvals queue filtered by the approver’s tier
•	SLA countdown timer per pending request
•	Approve / Reject action buttons with inline remarks field
•	Historical approvals (approved and rejected) for the logged-in approver
•	Delegation management panel (configure, view active delegations)
11.3 Administrator Dashboard
•	All Requests view with advanced filtering by status, division, date range, server reference
•	SLA Compliance panel: on-time vs breached, average processing time per stage
•	Infrastructure Demand chart: request volume over time, resource type breakdown (vCPU, memory, storage)
•	Capacity Utilisation: available vs allocated storage by server reference
•	Approval Chain Performance: average time per tier, identification of bottleneck tiers
 
12. Non-Functional Requirements
Category	Requirement	Target
Performance	Page load time	All module pages render within 2 seconds under normal load
Performance	Search response	Full-text search across requests returns within 1 second
Availability	Uptime	99.5% availability during business hours (08:00–17:00 WAT, Mon–Fri)
Scalability	Concurrent users	Support 200 concurrent users across all module views
Security	Data at rest	All request data encrypted at rest (AES-256)
Security	Data in transit	TLS 1.2+ for all client-server communication
Security	Session management	Session timeout after 30 minutes of inactivity
Audit	Log retention	Audit logs retained for 7 years per CBN records policy
Audit	Immutability	Audit log table is append-only; no UPDATE or DELETE permitted
Compliance	Data classification	All module data classified as INTERNAL per CBN policy
Usability	Accessibility	WCAG 2.1 Level AA compliance for all module interfaces
Backup	Recovery	RPO: 1 hour; RTO: 4 hours
 
13. Appendices
Appendix A: Operating System Options
OS Option	Notes
Red Hat Enterprise Linux 8.x / 9.x	CBN standard; enterprise support via Red Hat subscription
CentOS Stream 8 / 9	Community edition; suitable for non-production workloads
Ubuntu Server 20.04 LTS / 22.04 LTS	Long-term support; widely used for PostgreSQL deployments
Oracle Linux 8.x / 9.x	Alternative with UEK kernel for Oracle DB workloads
Appendix B: VLAN Zone Definitions
Zone	Purpose	Access Policy
Internal VLAN (Secure)	DB and APP server communication	No external ingress; inter-VLAN only via firewall rules
DMZ VLAN	Web-facing servers	Controlled external ingress; outbound restricted
Management VLAN	Infrastructure management traffic	Admin access only; RBAC enforced
Backup VLAN	Backup and replication traffic	Dedicated bandwidth; no user traffic
Appendix C: Reference Number Format
All server/storage allocation requests receive an auto-generated reference number in the format:
SSA-YYYY-NNNNN where YYYY is the four-digit year and NNNNN is a zero-padded sequential number resetting annually. Example: SSA-2026-00001 for the first request of 2026.
Appendix D: Document Control
Version	Date	Author	Change Description
1.0	16 March 2026	Digibit Solutions Limited	Initial specification based on form ITD/QCMD/SCAO/SAF v1.0

— End of Document —

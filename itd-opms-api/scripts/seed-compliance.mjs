#!/usr/bin/env node
/**
 * Seed script for GRC Compliance Controls
 * Seeds all 7 frameworks: ISO 27001, NIST CSF, COBIT, PCI DSS, SOC 2, NDPR, CBN IT Guidelines
 *
 * Usage: node scripts/seed-compliance.mjs
 */

const API = "http://127.0.0.1:8089/api/v1";

// ── Login ──────────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@itd.cbn.gov.ng",
      password: "admin123",
    }),
  });
  const json = await res.json();
  if (json.status !== "success") throw new Error("Login failed: " + JSON.stringify(json));
  return json.data.accessToken;
}

// ── Create control ─────────────────────────────────────────────────
async function createControl(token, control) {
  const res = await fetch(`${API}/grc/compliance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(control),
  });
  const json = await res.json();
  if (res.status >= 400) {
    console.error(`  FAIL ${control.controlId}: ${JSON.stringify(json)}`);
    return false;
  }
  return true;
}

// ── Statuses for variety ───────────────────────────────────────────
const STATUSES = ["not_started", "partial", "implemented", "verified"];
function randomStatus() {
  const weights = [0.25, 0.30, 0.30, 0.15]; // realistic distribution
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r <= cum) return STATUSES[i];
  }
  return STATUSES[0];
}

// ══════════════════════════════════════════════════════════════════
//  FRAMEWORK DATA
// ══════════════════════════════════════════════════════════════════

const ISO_27001 = [
  // A.5 Organizational Controls
  { controlId: "A.5.1", controlName: "Policies for Information Security", description: "A set of policies for information security shall be defined, approved by management, published, and communicated to relevant personnel and interested parties." },
  { controlId: "A.5.2", controlName: "Information Security Roles and Responsibilities", description: "Information security roles and responsibilities shall be defined and allocated to ensure implementation and operation of information security." },
  { controlId: "A.5.3", controlName: "Segregation of Duties", description: "Conflicting duties and conflicting areas of responsibility shall be segregated to reduce opportunities for unauthorized or unintentional modification or misuse." },
  { controlId: "A.5.4", controlName: "Management Responsibilities", description: "Management shall require all personnel to apply information security in accordance with the established policies and procedures." },
  { controlId: "A.5.5", controlName: "Contact with Authorities", description: "Appropriate contacts with relevant authorities shall be maintained to ensure timely reporting of security incidents." },
  { controlId: "A.5.6", controlName: "Contact with Special Interest Groups", description: "Contacts with special interest groups or other specialist security forums and professional associations shall be maintained." },
  { controlId: "A.5.7", controlName: "Threat Intelligence", description: "Information relating to information security threats shall be collected and analyzed to produce threat intelligence." },
  { controlId: "A.5.8", controlName: "Information Security in Project Management", description: "Information security shall be integrated into project management to ensure risks are identified and addressed during the project lifecycle." },
  { controlId: "A.5.9", controlName: "Inventory of Information and Other Associated Assets", description: "An inventory of information and other associated assets, including owners, shall be developed and maintained." },
  { controlId: "A.5.10", controlName: "Acceptable Use of Information and Other Associated Assets", description: "Rules for the acceptable use of information and other associated assets shall be identified, documented, and implemented." },
  { controlId: "A.5.11", controlName: "Return of Assets", description: "Personnel and other interested parties shall return all organizational assets in their possession upon change or termination of employment, contract, or agreement." },
  { controlId: "A.5.12", controlName: "Classification of Information", description: "Information shall be classified according to information security needs based on confidentiality, integrity, availability, and relevant interested party requirements." },
  { controlId: "A.5.13", controlName: "Labelling of Information", description: "An appropriate set of procedures for information labelling shall be developed and implemented in accordance with the classification scheme." },
  { controlId: "A.5.14", controlName: "Information Transfer", description: "Information transfer rules, procedures, or agreements shall be in place for all types of transfer facilities within the organization and between the organization and other parties." },
  { controlId: "A.5.15", controlName: "Access Control", description: "Rules to control physical and logical access to information and other associated assets shall be established and implemented." },
  { controlId: "A.5.16", controlName: "Identity Management", description: "The full lifecycle of identities shall be managed to ensure unique identification of individuals and systems accessing organizational information." },
  { controlId: "A.5.17", controlName: "Authentication Information", description: "Allocation and management of authentication information shall be controlled by a management process, including advising personnel on appropriate handling." },
  { controlId: "A.5.18", controlName: "Access Rights", description: "Access rights to information and other associated assets shall be provisioned, reviewed, modified, and removed in accordance with the topic-specific policy." },
  { controlId: "A.5.19", controlName: "Information Security in Supplier Relationships", description: "Processes and procedures shall be defined and implemented to manage information security risks associated with the use of supplier products or services." },
  { controlId: "A.5.20", controlName: "Addressing Information Security within Supplier Agreements", description: "Relevant information security requirements shall be established and agreed with each supplier based on the type of supplier relationship." },
  { controlId: "A.5.21", controlName: "Managing Information Security in the ICT Supply Chain", description: "Processes and procedures shall be defined and implemented for managing information security risks associated with the ICT products and services supply chain." },
  { controlId: "A.5.22", controlName: "Monitoring, Review and Change Management of Supplier Services", description: "The organization shall regularly monitor, review, evaluate, and manage changes in supplier information security practices and service delivery." },
  { controlId: "A.5.23", controlName: "Information Security for Use of Cloud Services", description: "Processes for acquisition, use, management, and exit from cloud services shall be established in accordance with information security requirements." },
  { controlId: "A.5.24", controlName: "Information Security Incident Management Planning and Preparation", description: "The organization shall plan and prepare for managing information security incidents by defining, establishing, and communicating processes, roles, and responsibilities." },
  { controlId: "A.5.25", controlName: "Assessment and Decision on Information Security Events", description: "The organization shall assess information security events and decide if they are to be categorized as information security incidents." },
  { controlId: "A.5.26", controlName: "Response to Information Security Incidents", description: "Information security incidents shall be responded to in accordance with the documented procedures." },
  { controlId: "A.5.27", controlName: "Learning from Information Security Incidents", description: "Knowledge gained from information security incidents shall be used to strengthen and improve the information security controls." },
  { controlId: "A.5.28", controlName: "Collection of Evidence", description: "The organization shall establish and implement procedures for the identification, collection, acquisition, and preservation of evidence related to information security events." },
  { controlId: "A.5.29", controlName: "Information Security During Disruption", description: "The organization shall plan how to maintain information security at an appropriate level during disruption." },
  { controlId: "A.5.30", controlName: "ICT Readiness for Business Continuity", description: "ICT readiness shall be planned, implemented, maintained, and tested based on business continuity objectives and ICT continuity requirements." },
  { controlId: "A.5.31", controlName: "Legal, Statutory, Regulatory and Contractual Requirements", description: "Legal, statutory, regulatory, and contractual requirements relevant to information security and the organization's approach to meet these requirements shall be identified and documented." },
  { controlId: "A.5.32", controlName: "Intellectual Property Rights", description: "The organization shall implement appropriate procedures to protect intellectual property rights." },
  { controlId: "A.5.33", controlName: "Protection of Records", description: "Records shall be protected from loss, destruction, falsification, unauthorized access, and unauthorized release." },
  { controlId: "A.5.34", controlName: "Privacy and Protection of PII", description: "The organization shall identify and meet the requirements regarding the preservation of privacy and protection of PII as applicable." },
  { controlId: "A.5.35", controlName: "Independent Review of Information Security", description: "The organization's approach to managing information security and its implementation shall be reviewed independently at planned intervals." },
  { controlId: "A.5.36", controlName: "Compliance with Policies, Rules and Standards", description: "Compliance with the organization's information security policy, topic-specific policies, rules, and standards shall be regularly reviewed." },
  { controlId: "A.5.37", controlName: "Documented Operating Procedures", description: "Operating procedures for information processing facilities shall be documented and made available to personnel who need them." },

  // A.6 People Controls
  { controlId: "A.6.1", controlName: "Screening", description: "Background verification checks on all candidates to become personnel shall be carried out prior to joining the organization and on an ongoing basis." },
  { controlId: "A.6.2", controlName: "Terms and Conditions of Employment", description: "The employment contractual agreements shall state the personnel's and the organization's responsibilities for information security." },
  { controlId: "A.6.3", controlName: "Information Security Awareness, Education and Training", description: "Personnel and relevant interested parties shall receive appropriate information security awareness, education, and training, and regular updates of the organization's policies and procedures." },
  { controlId: "A.6.4", controlName: "Disciplinary Process", description: "A disciplinary process shall be formalized and communicated to take actions against personnel and other interested parties who have committed an information security policy violation." },
  { controlId: "A.6.5", controlName: "Responsibilities After Termination or Change of Employment", description: "Information security responsibilities and duties that remain valid after termination or change of employment shall be defined, enforced, and communicated." },
  { controlId: "A.6.6", controlName: "Confidentiality or Non-Disclosure Agreements", description: "Confidentiality or non-disclosure agreements reflecting the organization's needs for the protection of information shall be identified, documented, regularly reviewed, and signed by personnel." },
  { controlId: "A.6.7", controlName: "Remote Working", description: "Security measures shall be implemented when personnel are working remotely to protect information accessed, processed, or stored outside the organization's premises." },
  { controlId: "A.6.8", controlName: "Information Security Event Reporting", description: "The organization shall provide a mechanism for personnel to report observed or suspected information security events through appropriate channels in a timely manner." },

  // A.7 Physical Controls
  { controlId: "A.7.1", controlName: "Physical Security Perimeters", description: "Security perimeters shall be defined and used to protect areas that contain information and other associated assets." },
  { controlId: "A.7.2", controlName: "Physical Entry", description: "Secure areas shall be protected by appropriate entry controls and access points." },
  { controlId: "A.7.3", controlName: "Securing Offices, Rooms and Facilities", description: "Physical security for offices, rooms, and facilities shall be designed and implemented." },
  { controlId: "A.7.4", controlName: "Physical Security Monitoring", description: "Premises shall be continuously monitored for unauthorized physical access." },
  { controlId: "A.7.5", controlName: "Protecting Against Physical and Environmental Threats", description: "Protection against physical and environmental threats, such as natural disasters and other intentional or unintentional physical threats to infrastructure shall be designed and implemented." },
  { controlId: "A.7.6", controlName: "Working in Secure Areas", description: "Security measures for working in secure areas shall be designed and implemented." },
  { controlId: "A.7.7", controlName: "Clear Desk and Clear Screen", description: "Clear desk rules for papers and removable storage media and clear screen rules for information processing facilities shall be defined and enforced." },
  { controlId: "A.7.8", controlName: "Equipment Siting and Protection", description: "Equipment shall be sited securely and protected to reduce risks from physical and environmental threats and unauthorized access." },
  { controlId: "A.7.9", controlName: "Security of Assets Off-Premises", description: "Off-site assets shall be protected considering the different risks of working outside the organization's premises." },
  { controlId: "A.7.10", controlName: "Storage Media", description: "Storage media shall be managed through their lifecycle of acquisition, use, transportation, and disposal in accordance with the classification scheme." },
  { controlId: "A.7.11", controlName: "Supporting Utilities", description: "Information processing facilities shall be protected from power failures and other disruptions caused by failures in supporting utilities." },
  { controlId: "A.7.12", controlName: "Cabling Security", description: "Cables carrying power, data, or supporting information services shall be protected from interception, interference, or damage." },
  { controlId: "A.7.13", controlName: "Equipment Maintenance", description: "Equipment shall be maintained correctly to ensure availability, integrity, and continued confidentiality of information." },
  { controlId: "A.7.14", controlName: "Secure Disposal or Re-Use of Equipment", description: "Items of equipment containing storage media shall be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use." },

  // A.8 Technological Controls
  { controlId: "A.8.1", controlName: "User Endpoint Devices", description: "Information stored on, processed by, or accessible via user endpoint devices shall be protected." },
  { controlId: "A.8.2", controlName: "Privileged Access Rights", description: "The allocation and use of privileged access rights shall be restricted and managed." },
  { controlId: "A.8.3", controlName: "Information Access Restriction", description: "Access to information and other associated assets shall be restricted in accordance with the established topic-specific policy on access control." },
  { controlId: "A.8.4", controlName: "Access to Source Code", description: "Read and write access to source code, development tools, and software libraries shall be appropriately managed." },
  { controlId: "A.8.5", controlName: "Secure Authentication", description: "Secure authentication technologies and procedures shall be established and implemented based on information access restrictions and the topic-specific policy on access control." },
  { controlId: "A.8.6", controlName: "Capacity Management", description: "The use of resources shall be monitored and adjusted in line with current and expected capacity requirements." },
  { controlId: "A.8.7", controlName: "Protection Against Malware", description: "Protection against malware shall be implemented and supported by appropriate user awareness." },
  { controlId: "A.8.8", controlName: "Management of Technical Vulnerabilities", description: "Information about technical vulnerabilities of information systems in use shall be obtained; the organization's exposure shall be evaluated and appropriate measures taken." },
  { controlId: "A.8.9", controlName: "Configuration Management", description: "Configurations, including security configurations, of hardware, software, services, and networks shall be established, documented, implemented, monitored, and reviewed." },
  { controlId: "A.8.10", controlName: "Information Deletion", description: "Information stored in information systems, devices, or in any other storage media shall be deleted when no longer required." },
  { controlId: "A.8.11", controlName: "Data Masking", description: "Data masking shall be used in accordance with the organization's topic-specific policy on access control and other related policies and business requirements." },
  { controlId: "A.8.12", controlName: "Data Leakage Prevention", description: "Data leakage prevention measures shall be applied to systems, networks, and any other devices that process, store, or transmit sensitive information." },
  { controlId: "A.8.13", controlName: "Information Backup", description: "Backup copies of information, software, and systems shall be maintained and regularly tested in accordance with the agreed topic-specific policy on backup." },
  { controlId: "A.8.14", controlName: "Redundancy of Information Processing Facilities", description: "Information processing facilities shall be implemented with redundancy sufficient to meet availability requirements." },
  { controlId: "A.8.15", controlName: "Logging", description: "Logs that record activities, exceptions, faults, and other relevant events shall be produced, stored, protected, and analyzed." },
  { controlId: "A.8.16", controlName: "Monitoring Activities", description: "Networks, systems, and applications shall be monitored for anomalous behavior and appropriate actions taken to evaluate potential information security incidents." },
  { controlId: "A.8.17", controlName: "Clock Synchronization", description: "The clocks of information processing systems used by the organization shall be synchronized to approved time sources." },
  { controlId: "A.8.18", controlName: "Use of Privileged Utility Programs", description: "The use of utility programs that can be capable of overriding system and application controls shall be restricted and tightly controlled." },
  { controlId: "A.8.19", controlName: "Installation of Software on Operational Systems", description: "Procedures and measures shall be implemented to securely manage software installation on operational systems." },
  { controlId: "A.8.20", controlName: "Networks Security", description: "Networks and network devices shall be secured, managed, and controlled to protect information in systems and applications." },
  { controlId: "A.8.21", controlName: "Security of Network Services", description: "Security mechanisms, service levels, and service requirements of network services shall be identified, implemented, and monitored." },
  { controlId: "A.8.22", controlName: "Segregation of Networks", description: "Groups of information services, users, and information systems shall be segregated in the organization's networks." },
  { controlId: "A.8.23", controlName: "Web Filtering", description: "Access to external websites shall be managed to reduce exposure to malicious content." },
  { controlId: "A.8.24", controlName: "Use of Cryptography", description: "Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented." },
  { controlId: "A.8.25", controlName: "Secure Development Life Cycle", description: "Rules for the secure development of software and systems shall be established and applied." },
  { controlId: "A.8.26", controlName: "Application Security Requirements", description: "Information security requirements shall be identified, specified, and approved when developing or acquiring applications." },
  { controlId: "A.8.27", controlName: "Secure System Architecture and Engineering Principles", description: "Principles for engineering secure systems shall be established, documented, maintained, and applied to any information system development activity." },
  { controlId: "A.8.28", controlName: "Secure Coding", description: "Secure coding principles shall be applied to software development." },
  { controlId: "A.8.29", controlName: "Security Testing in Development and Acceptance", description: "Security testing processes shall be defined and implemented in the development life cycle." },
  { controlId: "A.8.30", controlName: "Outsourced Development", description: "The organization shall direct, monitor, and review the activities related to outsourced system development." },
  { controlId: "A.8.31", controlName: "Separation of Development, Test and Production Environments", description: "Development, testing, and production environments shall be separated and secured." },
  { controlId: "A.8.32", controlName: "Change Management", description: "Changes to information processing facilities and information systems shall be subject to change management procedures." },
  { controlId: "A.8.33", controlName: "Test Information", description: "Test information shall be appropriately selected, protected, and managed." },
  { controlId: "A.8.34", controlName: "Protection of Information Systems During Audit Testing", description: "Audit tests and other assurance activities involving assessment of operational systems shall be planned and agreed between the tester and appropriate management." },
];

const NIST_CSF = [
  // GV - Govern
  { controlId: "GV.OC-01", controlName: "Organizational Context", description: "The circumstances — mission, stakeholder expectations, dependencies, and legal, regulatory, and contractual requirements — surrounding the organization's cybersecurity risk management decisions are understood." },
  { controlId: "GV.OC-02", controlName: "Internal Stakeholders", description: "Internal stakeholders understand and perform their cybersecurity risk management responsibilities." },
  { controlId: "GV.OC-03", controlName: "Legal & Regulatory Requirements", description: "Legal, regulatory, and contractual requirements regarding cybersecurity — including privacy and civil liberties obligations — are understood and managed." },
  { controlId: "GV.RM-01", controlName: "Risk Management Objectives", description: "Risk management objectives are established and agreed upon by organizational stakeholders." },
  { controlId: "GV.RM-02", controlName: "Risk Appetite & Tolerance", description: "Risk appetite and risk tolerance statements are established, communicated, and maintained." },
  { controlId: "GV.RM-03", controlName: "Enterprise Risk Integration", description: "Cybersecurity risk management activities and outcomes are included in enterprise risk management processes." },
  { controlId: "GV.RR-01", controlName: "Organizational Leadership", description: "Organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical, and continuously improving." },
  { controlId: "GV.RR-02", controlName: "Roles and Responsibilities", description: "Cybersecurity roles, responsibilities, and authorities to foster accountability are established, communicated, and enforced." },
  { controlId: "GV.SC-01", controlName: "Supply Chain Risk Management Program", description: "A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders." },
  { controlId: "GV.SC-02", controlName: "Supply Chain Risk Assessment", description: "Cybersecurity risks associated with the supply chain are identified, assessed, and managed using a defined process." },

  // ID - Identify
  { controlId: "ID.AM-01", controlName: "Hardware Asset Inventory", description: "Inventories of hardware managed by the organization are maintained." },
  { controlId: "ID.AM-02", controlName: "Software Asset Inventory", description: "Inventories of software, services, and systems managed by the organization are maintained." },
  { controlId: "ID.AM-03", controlName: "Network Communication Mapping", description: "Representations of the organization's authorized network communication and internal and external network data flows are maintained." },
  { controlId: "ID.AM-04", controlName: "External Service Provider Catalog", description: "Inventories of services provided by suppliers are maintained." },
  { controlId: "ID.AM-05", controlName: "Asset Prioritization", description: "Assets are prioritized based on classification, criticality, resources, and impact on the mission." },
  { controlId: "ID.RA-01", controlName: "Vulnerability Identification", description: "Vulnerabilities in assets are identified, validated, and recorded." },
  { controlId: "ID.RA-02", controlName: "Threat Intelligence Integration", description: "Cyber threat intelligence is received from information sharing forums and sources." },
  { controlId: "ID.RA-03", controlName: "Internal and External Threats", description: "Internal and external threats to the organization are identified and recorded." },
  { controlId: "ID.RA-04", controlName: "Potential Impact Assessment", description: "Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded." },
  { controlId: "ID.RA-05", controlName: "Risk Determination", description: "Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform risk response prioritization." },
  { controlId: "ID.IM-01", controlName: "Improvement from Evaluations", description: "Improvements are identified from evaluations of the organization's cybersecurity posture." },
  { controlId: "ID.IM-02", controlName: "Improvement from Security Tests", description: "Improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties." },

  // PR - Protect
  { controlId: "PR.AA-01", controlName: "Identity Management", description: "Identities and credentials for authorized users, services, and hardware are managed by the organization." },
  { controlId: "PR.AA-02", controlName: "Identity Proofing", description: "Identities are proofed and bound to credentials based on the context of interactions." },
  { controlId: "PR.AA-03", controlName: "Multi-Factor Authentication", description: "Users, services, and hardware are authenticated using appropriate multi-factor authentication methods." },
  { controlId: "PR.AA-04", controlName: "Access Permissions Management", description: "Identity assertions are protected, conveyed, and verified through access permissions management." },
  { controlId: "PR.AA-05", controlName: "Least Privilege & Separation of Duties", description: "Access permissions, entitlements, and authorizations are defined using principles of least privilege and separation of duties." },
  { controlId: "PR.AT-01", controlName: "Security Awareness Training", description: "Personnel are provided cybersecurity awareness and training so they can perform their cybersecurity-related tasks." },
  { controlId: "PR.DS-01", controlName: "Data-at-Rest Protection", description: "The confidentiality, integrity, and availability of data-at-rest are protected." },
  { controlId: "PR.DS-02", controlName: "Data-in-Transit Protection", description: "The confidentiality, integrity, and availability of data-in-transit are protected." },
  { controlId: "PR.DS-10", controlName: "Data-in-Use Confidentiality", description: "The confidentiality, integrity, and availability of data-in-use are protected." },
  { controlId: "PR.PS-01", controlName: "Configuration Management Practices", description: "Configuration management practices are established and applied." },
  { controlId: "PR.PS-02", controlName: "Software Maintenance", description: "Software is maintained, replaced, and removed in accordance with established policies." },
  { controlId: "PR.PS-04", controlName: "Log Record Generation", description: "Log records are generated and made available for continuous monitoring." },
  { controlId: "PR.IR-01", controlName: "Networks and Environments Protection", description: "Networks and environments are protected from unauthorized logical access and usage." },
  { controlId: "PR.IR-02", controlName: "Technology Asset Hardening", description: "The organization's technology assets are protected from environmental threats." },

  // DE - Detect
  { controlId: "DE.CM-01", controlName: "Network Monitoring", description: "Networks and network services are monitored to find potentially adverse events." },
  { controlId: "DE.CM-02", controlName: "Physical Environment Monitoring", description: "The physical environment is monitored to find potentially adverse events." },
  { controlId: "DE.CM-03", controlName: "Personnel Activity Monitoring", description: "Personnel activity and technology usage are monitored to find potentially adverse events." },
  { controlId: "DE.CM-06", controlName: "External Service Provider Monitoring", description: "External service provider activities and services are monitored to find potentially adverse events." },
  { controlId: "DE.CM-09", controlName: "Computing Hardware & Software Monitoring", description: "Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events." },
  { controlId: "DE.AE-02", controlName: "Adverse Event Analysis", description: "Potentially adverse events are analyzed to better understand associated activities." },
  { controlId: "DE.AE-03", controlName: "Event Correlation", description: "Information is correlated from multiple sources to achieve situational awareness and to determine if a cybersecurity incident has occurred." },
  { controlId: "DE.AE-06", controlName: "Incident Declaration", description: "Information on adverse events is provided to authorized staff and tools for incident declaration." },

  // RS - Respond
  { controlId: "RS.MA-01", controlName: "Incident Management Execution", description: "The incident response plan is executed in coordination with relevant third parties once an incident is declared." },
  { controlId: "RS.MA-02", controlName: "Incident Triage", description: "Incidents are categorized and prioritized to support effective response." },
  { controlId: "RS.MA-03", controlName: "Incident Eradication", description: "Incidents are eradicated through removal of malware, isolating affected systems, or taking other appropriate actions." },
  { controlId: "RS.AN-03", controlName: "Incident Impact Estimation", description: "Estimates of the magnitude of an incident are made." },
  { controlId: "RS.CO-02", controlName: "Internal Incident Reporting", description: "Internal and external stakeholders are notified of incidents." },
  { controlId: "RS.CO-03", controlName: "Incident Information Sharing", description: "Information is shared with designated internal and external stakeholders." },

  // RC - Recover
  { controlId: "RC.RP-01", controlName: "Recovery Plan Execution", description: "The recovery portion of the incident response plan is executed once initiated from the incident response process." },
  { controlId: "RC.RP-02", controlName: "Recovery Action Selection", description: "Recovery actions are selected, scoped, and prioritized considering the severity and lessons learned from prior incidents." },
  { controlId: "RC.RP-03", controlName: "Recovery Verification", description: "The integrity of backups and other restoration assets is verified before using them for restoration." },
  { controlId: "RC.RP-04", controlName: "Critical Mission Function Restoration", description: "Critical mission functions and cybersecurity risk management are re-established as part of the recovery process." },
  { controlId: "RC.CO-03", controlName: "Recovery Communication", description: "Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders." },
  { controlId: "RC.CO-04", controlName: "Public Notification", description: "Public updates on incident recovery are shared using approved methods and messaging." },
];

const COBIT = [
  // EDM - Evaluate, Direct, Monitor
  { controlId: "EDM01", controlName: "Ensured Governance Framework Setting and Maintenance", description: "Analyze and articulate the requirements for the governance of enterprise IT and put in place and maintain effective enabling structures, principles, processes, and practices." },
  { controlId: "EDM02", controlName: "Ensured Benefits Delivery", description: "Optimize the value contribution to the business from the business processes, IT services, and IT assets resulting from investment made by IT at acceptable costs." },
  { controlId: "EDM03", controlName: "Ensured Risk Optimization", description: "Ensure that the enterprise's risk appetite and tolerance are understood, articulated, and communicated, and that risk to enterprise value related to the use of IT is identified and managed." },
  { controlId: "EDM04", controlName: "Ensured Resource Optimization", description: "Ensure that adequate and sufficient IT-related capabilities (people, process, and technology) are available to support enterprise objectives effectively at optimal cost." },
  { controlId: "EDM05", controlName: "Ensured Stakeholder Engagement", description: "Ensure that enterprise IT stakeholders are supportive of the IT strategy and road map, communication is effective, and reporting on enterprise IT performance is timely and accurate." },

  // APO - Align, Plan, Organize
  { controlId: "APO01", controlName: "Managed IT Management Framework", description: "Clarify and maintain the governance of enterprise IT, implement mechanisms and authority to manage information and the use of IT in support of governance objectives." },
  { controlId: "APO02", controlName: "Managed Strategy", description: "Provide a holistic view of the current IT and business environment, the future direction, and the initiatives required to migrate to the desired future environment." },
  { controlId: "APO03", controlName: "Managed Enterprise Architecture", description: "Represent the different building blocks that make up the enterprise and their interrelationships as well as the principles guiding their design and evolution over time." },
  { controlId: "APO04", controlName: "Managed Innovation", description: "Achieve competitive advantage, business innovation, and improved operational effectiveness and efficiency by exploiting IT developments, emerging technologies, and innovation capabilities." },
  { controlId: "APO05", controlName: "Managed Portfolio", description: "Execute the strategic direction set for investments in line with the enterprise architecture vision and the desired characteristics of the investment and related services portfolios." },
  { controlId: "APO06", controlName: "Managed Budget and Costs", description: "Manage the IT-related financial activities in both business and IT functions, covering budget, cost allocation, benefit management, and prioritization of spending." },
  { controlId: "APO07", controlName: "Managed Human Resources", description: "Provide a structured approach to ensure optimal structuring, placement, decision rights, and skills of human resources including sourcing strategy and recruitment." },
  { controlId: "APO08", controlName: "Managed Relationships", description: "Manage the relationship between the business and IT in a formalized and transparent way that ensures a focus on achieving a common and shared goal." },
  { controlId: "APO09", controlName: "Managed Service Agreements", description: "Align IT-enabled services and service levels with enterprise needs and expectations, including identification, specification, design, publishing, agreement, and monitoring." },
  { controlId: "APO10", controlName: "Managed Vendors", description: "Manage IT-related services provided by all types of vendors to meet enterprise requirements, including selection of vendors, management of relationships, and management of contracts." },
  { controlId: "APO11", controlName: "Managed Quality", description: "Define and communicate quality requirements in all processes, procedures, and the related enterprise outcomes. Monitor and use metrics for continuous improvement." },
  { controlId: "APO12", controlName: "Managed Risk", description: "Continually identify, assess, and reduce IT-related risk within levels of tolerance set by enterprise management." },
  { controlId: "APO13", controlName: "Managed Security", description: "Define, operate, and monitor an information security management system (ISMS) to protect enterprise information and minimize the impact of security vulnerabilities." },
  { controlId: "APO14", controlName: "Managed Data", description: "Achieve and sustain effective management of enterprise data assets throughout the data lifecycle." },

  // BAI - Build, Acquire, Implement
  { controlId: "BAI01", controlName: "Managed Programs", description: "Manage all programs from the investment portfolio in coordination with the enterprise program management approach." },
  { controlId: "BAI02", controlName: "Managed Requirements Definition", description: "Identify solutions and analyze requirements before acquisition or creation to ensure that they are in line with enterprise strategic requirements." },
  { controlId: "BAI03", controlName: "Managed Solutions Identification and Build", description: "Establish and maintain identified solutions in line with enterprise requirements covering design, development, procurement, and partnering with suppliers." },
  { controlId: "BAI04", controlName: "Managed Availability and Capacity", description: "Balance current and future needs for availability, performance, and capacity with cost-effective service provision." },
  { controlId: "BAI05", controlName: "Managed Organizational Change", description: "Prepare and commit stakeholders for business change and reduce the risk of failure by proactive engagement of all affected stakeholders." },
  { controlId: "BAI06", controlName: "Managed IT Changes", description: "Manage all changes in a controlled manner, including standard changes and emergency maintenance relating to business processes, applications, and infrastructure." },
  { controlId: "BAI07", controlName: "Managed IT Change Acceptance and Transitioning", description: "Formally accept and make operational new solutions, including implementation planning, system and data conversion, acceptance testing, and communication." },
  { controlId: "BAI08", controlName: "Managed Knowledge", description: "Maintain the availability of relevant, current, validated, and reliable knowledge to support all process activities and to facilitate decision-making." },
  { controlId: "BAI09", controlName: "Managed Assets", description: "Manage IT assets through their lifecycle to make sure that their use delivers value at optimal cost, they remain operational, and they are accounted for and physically protected." },
  { controlId: "BAI10", controlName: "Managed Configuration", description: "Define and maintain descriptions and relationships between key resources and capabilities required to deliver IT-enabled services." },
  { controlId: "BAI11", controlName: "Managed Projects", description: "Manage all projects initiated within the enterprise in a coordinated manner that is in line with the enterprise's strategy and managed in a structured way." },

  // DSS - Deliver, Service, Support
  { controlId: "DSS01", controlName: "Managed Operations", description: "Coordinate and execute the activities and operational procedures required to deliver internal and outsourced IT services." },
  { controlId: "DSS02", controlName: "Managed Service Requests and Incidents", description: "Provide timely and effective response to user requests and resolution of all types of incidents to minimize business impact." },
  { controlId: "DSS03", controlName: "Managed Problems", description: "Identify and classify problems and their root causes, and provide timely resolution to prevent recurring incidents." },
  { controlId: "DSS04", controlName: "Managed Continuity", description: "Establish and maintain a plan to enable the business and IT to respond to incidents and disruptions in order to continue operation of critical business processes and services." },
  { controlId: "DSS05", controlName: "Managed Security Services", description: "Protect enterprise information to maintain the level of information security risk acceptable to the enterprise in accordance with the security policy." },
  { controlId: "DSS06", controlName: "Managed Business Process Controls", description: "Define and maintain appropriate business process controls to ensure that information related to and processed by in-house or outsourced business processes satisfies all relevant information control requirements." },

  // MEA - Monitor, Evaluate, Assess
  { controlId: "MEA01", controlName: "Managed Performance and Conformance Monitoring", description: "Collect, validate, and evaluate business, IT, and process goals and metrics. Monitor that processes are performing against agreed-upon performance and conformance goals." },
  { controlId: "MEA02", controlName: "Managed System of Internal Control", description: "Continuously monitor and evaluate the control environment, including self-assessments and independent assurance reviews." },
  { controlId: "MEA03", controlName: "Managed Compliance with External Requirements", description: "Evaluate that IT processes and IT-supported business processes are compliant with laws, regulations, and contractual requirements." },
  { controlId: "MEA04", controlName: "Managed Assurance", description: "Enable the organization to design and develop efficient and effective assurance initiatives by providing guidance on planning, scoping, executing, and following up on assurance reviews." },
];

const PCI_DSS = [
  // Requirement 1: Network Security Controls
  { controlId: "PCI-1.1", controlName: "Network Security Controls Defined and Understood", description: "Processes and mechanisms for installing and maintaining network security controls are defined, documented, and understood by all affected parties." },
  { controlId: "PCI-1.2", controlName: "Network Security Controls Configured and Maintained", description: "Network security controls (NSCs) are configured and maintained to restrict traffic between trusted and untrusted networks." },
  { controlId: "PCI-1.3", controlName: "Network Access Restricted", description: "Network access to and from the cardholder data environment is restricted." },
  { controlId: "PCI-1.4", controlName: "Network Connections Controlled", description: "Network connections between trusted and untrusted networks are controlled." },
  { controlId: "PCI-1.5", controlName: "Risks to CDE Mitigated", description: "Risks to the CDE from computing devices that are able to connect to both untrusted networks and the CDE are mitigated." },

  // Requirement 2: Secure Configurations
  { controlId: "PCI-2.1", controlName: "Secure Configuration Processes", description: "Processes and mechanisms for applying secure configurations to all system components are defined and understood." },
  { controlId: "PCI-2.2", controlName: "System Components Configured Securely", description: "System components are configured and managed securely with industry-accepted hardening standards." },
  { controlId: "PCI-2.3", controlName: "Wireless Environments Configured Securely", description: "Wireless environments are configured and managed securely." },

  // Requirement 3: Protect Stored Account Data
  { controlId: "PCI-3.1", controlName: "Stored Account Data Protection Processes", description: "Processes and mechanisms for protecting stored account data are defined and understood." },
  { controlId: "PCI-3.2", controlName: "Storage of Account Data Minimized", description: "Storage of account data is kept to a minimum with data retention and disposal policies enforced." },
  { controlId: "PCI-3.3", controlName: "Sensitive Authentication Data Not Stored", description: "Sensitive authentication data (SAD) is not stored after authorization." },
  { controlId: "PCI-3.4", controlName: "PAN Display Restricted", description: "Access to displays of full PAN and ability to copy cardholder data are restricted." },
  { controlId: "PCI-3.5", controlName: "PAN Secured Wherever Stored", description: "Primary account number (PAN) is secured wherever it is stored." },

  // Requirement 4: Protect Data in Transit
  { controlId: "PCI-4.1", controlName: "Data-in-Transit Protection Processes", description: "Processes and mechanisms for protecting cardholder data with strong cryptography during transmission over open, public networks are defined and documented." },
  { controlId: "PCI-4.2", controlName: "PAN Protected During Transmission", description: "PAN is protected with strong cryptography during transmission." },

  // Requirement 5: Protect from Malicious Software
  { controlId: "PCI-5.1", controlName: "Anti-Malware Processes", description: "Processes and mechanisms for protecting all systems and networks from malicious software are defined and understood." },
  { controlId: "PCI-5.2", controlName: "Malicious Software Prevented or Detected", description: "Malicious software (malware) is prevented, or detected and addressed." },
  { controlId: "PCI-5.3", controlName: "Anti-Malware Maintained and Monitored", description: "Anti-malware mechanisms and processes are active, maintained, and monitored." },
  { controlId: "PCI-5.4", controlName: "Anti-Phishing Mechanisms", description: "Anti-phishing mechanisms protect users against phishing attacks." },

  // Requirement 6: Develop and Maintain Secure Systems
  { controlId: "PCI-6.1", controlName: "Secure Development Processes", description: "Processes and mechanisms for developing and maintaining secure systems and software are defined and understood." },
  { controlId: "PCI-6.2", controlName: "Bespoke and Custom Software Security", description: "Bespoke and custom software are developed securely." },
  { controlId: "PCI-6.3", controlName: "Security Vulnerabilities Identified and Addressed", description: "Security vulnerabilities are identified and addressed." },
  { controlId: "PCI-6.4", controlName: "Web Applications Protected from Attacks", description: "Public-facing web applications are protected against attacks." },
  { controlId: "PCI-6.5", controlName: "Changes Managed Securely", description: "Changes to all system components are managed securely." },

  // Requirement 7: Restrict Access by Business Need
  { controlId: "PCI-7.1", controlName: "Access Control Processes", description: "Processes and mechanisms for restricting access to system components and cardholder data by business need to know are defined and understood." },
  { controlId: "PCI-7.2", controlName: "Access Appropriately Defined and Assigned", description: "Access to system components and data is appropriately defined and assigned." },
  { controlId: "PCI-7.3", controlName: "Access Control System Managed", description: "Access to system components and data is managed via an access control system(s)." },

  // Requirement 8: Identify Users and Authenticate Access
  { controlId: "PCI-8.1", controlName: "User Identification Processes", description: "Processes and mechanisms for identifying users and authenticating access to system components are defined and understood." },
  { controlId: "PCI-8.2", controlName: "User Identification and Access Management", description: "User identification and related accounts are strictly managed throughout the account lifecycle." },
  { controlId: "PCI-8.3", controlName: "Strong Authentication Established", description: "Strong authentication for users and administrators is established and managed." },
  { controlId: "PCI-8.4", controlName: "MFA for CDE Access", description: "Multi-factor authentication (MFA) is implemented to secure access into the CDE." },
  { controlId: "PCI-8.5", controlName: "MFA Systems Configured Properly", description: "Multi-factor authentication (MFA) systems are configured to prevent misuse." },
  { controlId: "PCI-8.6", controlName: "Application and System Accounts Managed", description: "Use of application and system accounts and associated authentication factors is strictly managed." },

  // Requirement 9: Restrict Physical Access
  { controlId: "PCI-9.1", controlName: "Physical Access Restriction Processes", description: "Processes and mechanisms for restricting physical access to cardholder data are defined and understood." },
  { controlId: "PCI-9.2", controlName: "Physical Access Controls Managed", description: "Physical access controls manage entry into facilities and systems containing cardholder data." },
  { controlId: "PCI-9.3", controlName: "Visitor Physical Access Authorized and Managed", description: "Physical access for personnel and visitors is authorized and managed." },
  { controlId: "PCI-9.4", controlName: "Media with Cardholder Data Secured", description: "Media with cardholder data is securely stored, accessed, distributed, and destroyed." },
  { controlId: "PCI-9.5", controlName: "POI Devices Protected", description: "Point of interaction (POI) devices are protected from tampering and unauthorized substitution." },

  // Requirement 10: Log and Monitor Access
  { controlId: "PCI-10.1", controlName: "Logging and Monitoring Processes", description: "Processes and mechanisms for logging and monitoring all access to system components and cardholder data are defined and understood." },
  { controlId: "PCI-10.2", controlName: "Audit Logs Implemented", description: "Audit logs are implemented to support the detection of anomalies and suspicious activity." },
  { controlId: "PCI-10.3", controlName: "Audit Logs Protected from Destruction", description: "Audit logs are protected from destruction and unauthorized modifications." },
  { controlId: "PCI-10.4", controlName: "Audit Logs Reviewed", description: "Audit logs are reviewed to identify anomalies or suspicious activity." },
  { controlId: "PCI-10.5", controlName: "Audit Log History Retained", description: "Audit log history is retained and available for analysis." },
  { controlId: "PCI-10.6", controlName: "Time-Synchronization Mechanisms", description: "Time-synchronization mechanisms support consistent time settings across all systems." },
  { controlId: "PCI-10.7", controlName: "Failures in Critical Security Controls Detected", description: "Failures of critical security control systems are detected, reported, and responded to promptly." },

  // Requirement 11: Test Systems and Networks Regularly
  { controlId: "PCI-11.1", controlName: "Security Testing Processes", description: "Processes and mechanisms for regularly testing security of systems and networks are defined and understood." },
  { controlId: "PCI-11.2", controlName: "Wireless Access Points Identified and Monitored", description: "Authorized and unauthorized wireless access points are identified and monitored." },
  { controlId: "PCI-11.3", controlName: "Vulnerabilities Identified and Addressed", description: "External and internal vulnerabilities are regularly identified, prioritized, and addressed." },
  { controlId: "PCI-11.4", controlName: "Penetration Testing Performed", description: "External and internal penetration testing is regularly performed, and exploitable vulnerabilities and security weaknesses are corrected." },
  { controlId: "PCI-11.5", controlName: "Network Intrusions and File Changes Detected", description: "Network intrusions and unexpected file changes are detected and responded to." },
  { controlId: "PCI-11.6", controlName: "Payment Page Integrity Monitored", description: "Unauthorized changes on payment pages are detected and responded to." },

  // Requirement 12: Organizational Policies and Programs
  { controlId: "PCI-12.1", controlName: "Information Security Policy", description: "A comprehensive information security policy that governs and provides direction for protection of the entity's information assets is known and current." },
  { controlId: "PCI-12.2", controlName: "Acceptable Use Policies", description: "Acceptable use policies for end-user technologies are defined and implemented." },
  { controlId: "PCI-12.3", controlName: "Risks to CDE Formally Identified", description: "Risks to the cardholder data environment are formally identified, evaluated, and managed." },
  { controlId: "PCI-12.4", controlName: "PCI DSS Compliance Managed", description: "PCI DSS compliance is managed." },
  { controlId: "PCI-12.5", controlName: "PCI DSS Scope Documented", description: "PCI DSS scope is documented and validated." },
  { controlId: "PCI-12.6", controlName: "Security Awareness Education", description: "Security awareness education is an ongoing activity." },
  { controlId: "PCI-12.7", controlName: "Personnel Screened", description: "Personnel are screened to reduce risks from insider threats." },
  { controlId: "PCI-12.8", controlName: "TPSPs Supporting Information Security", description: "Risk to information assets associated with third-party service provider (TPSP) relationships is managed." },
  { controlId: "PCI-12.9", controlName: "TPSP Support for Customers", description: "Third-party service providers (TPSPs) support their customers' PCI DSS compliance." },
  { controlId: "PCI-12.10", controlName: "Security Incidents Responded to Immediately", description: "Suspected and confirmed security incidents that could impact the CDE are responded to immediately." },
];

const SOC2 = [
  // CC - Common Criteria (Security)
  { controlId: "CC1.1", controlName: "COSO Principle 1 — Integrity and Ethics", description: "The entity demonstrates a commitment to integrity and ethical values." },
  { controlId: "CC1.2", controlName: "COSO Principle 2 — Board Independence", description: "The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal controls." },
  { controlId: "CC1.3", controlName: "COSO Principle 3 — Management Structures", description: "Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives." },
  { controlId: "CC1.4", controlName: "COSO Principle 4 — Competence Commitment", description: "The entity demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives." },
  { controlId: "CC1.5", controlName: "COSO Principle 5 — Accountability", description: "The entity holds individuals accountable for their internal control responsibilities in the pursuit of objectives." },
  { controlId: "CC2.1", controlName: "COSO Principle 13 — Information Quality", description: "The entity obtains or generates and uses relevant, quality information to support the functioning of internal control." },
  { controlId: "CC2.2", controlName: "COSO Principle 14 — Internal Communication", description: "The entity internally communicates information, including objectives and responsibilities for internal control, necessary to support the functioning of internal control." },
  { controlId: "CC2.3", controlName: "COSO Principle 15 — External Communication", description: "The entity communicates with external parties regarding matters affecting the functioning of internal control." },
  { controlId: "CC3.1", controlName: "COSO Principle 6 — Risk Objectives", description: "The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives." },
  { controlId: "CC3.2", controlName: "COSO Principle 7 — Risk Identification and Analysis", description: "The entity identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed." },
  { controlId: "CC3.3", controlName: "COSO Principle 8 — Fraud Risk Assessment", description: "The entity considers the potential for fraud in assessing risks to the achievement of objectives." },
  { controlId: "CC3.4", controlName: "COSO Principle 9 — Change Impact on Internal Controls", description: "The entity identifies and assesses changes that could significantly impact the system of internal control." },
  { controlId: "CC4.1", controlName: "COSO Principle 16 — Monitoring Activities", description: "The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning." },
  { controlId: "CC4.2", controlName: "COSO Principle 17 — Deficiency Communication", description: "The entity evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action." },
  { controlId: "CC5.1", controlName: "COSO Principle 10 — Control Activity Selection", description: "The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels." },
  { controlId: "CC5.2", controlName: "COSO Principle 11 — Technology General Controls", description: "The entity also selects and develops general control activities over technology to support the achievement of objectives." },
  { controlId: "CC5.3", controlName: "COSO Principle 12 — Policies and Procedures", description: "The entity deploys control activities through policies that establish what is expected and in procedures that put policies into action." },
  { controlId: "CC6.1", controlName: "Logical and Physical Access Security", description: "The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events." },
  { controlId: "CC6.2", controlName: "User Registration and Authorization", description: "Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users." },
  { controlId: "CC6.3", controlName: "Role-Based Access and Least Privilege", description: "The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on roles and responsibilities." },
  { controlId: "CC6.4", controlName: "Physical Access Restrictions", description: "The entity restricts physical access to facilities and protected information assets to authorized personnel." },
  { controlId: "CC6.5", controlName: "Asset Disposal", description: "The entity discontinues logical and physical protections over physical assets only after the ability to read or recover data and software from those assets has been diminished." },
  { controlId: "CC6.6", controlName: "Boundary Protection", description: "The entity implements logical access security measures to protect against threats from sources outside its system boundaries." },
  { controlId: "CC6.7", controlName: "Data Transmission Protection", description: "The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes." },
  { controlId: "CC6.8", controlName: "Malicious Software Prevention", description: "The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software." },
  { controlId: "CC7.1", controlName: "Vulnerability Management", description: "To meet its objectives, the entity uses detection and monitoring procedures to identify changes to configurations that result in the introduction of new vulnerabilities." },
  { controlId: "CC7.2", controlName: "Anomaly Monitoring", description: "The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity's ability to meet its objectives." },
  { controlId: "CC7.3", controlName: "Security Event Evaluation", description: "The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives (security incidents)." },
  { controlId: "CC7.4", controlName: "Incident Response", description: "The entity responds to identified security incidents by executing a defined incident response program to understand, contain, remediate, and communicate security incidents." },
  { controlId: "CC7.5", controlName: "Incident Recovery", description: "The entity identifies, develops, and implements activities to recover from identified security incidents." },
  { controlId: "CC8.1", controlName: "Change Management", description: "The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures." },
  { controlId: "CC9.1", controlName: "Risk Mitigation", description: "The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions." },
  { controlId: "CC9.2", controlName: "Vendor and Business Partner Risk Management", description: "The entity assesses and manages risks associated with vendors and business partners." },

  // A - Availability
  { controlId: "A1.1", controlName: "Availability Commitments", description: "The entity maintains, monitors, and evaluates current processing capacity and use of system components to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives." },
  { controlId: "A1.2", controlName: "Environmental Protections", description: "The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections, software, data backup processes, and recovery infrastructure to meet its objectives." },
  { controlId: "A1.3", controlName: "Recovery Plan Testing", description: "The entity tests recovery plan procedures supporting system recovery to meet its objectives." },

  // C - Confidentiality
  { controlId: "C1.1", controlName: "Confidential Information Identification", description: "The entity identifies and maintains confidential information to meet the entity's objectives related to confidentiality." },
  { controlId: "C1.2", controlName: "Confidential Information Disposal", description: "The entity disposes of confidential information to meet the entity's objectives related to confidentiality." },

  // PI - Processing Integrity
  { controlId: "PI1.1", controlName: "Processing Completeness and Accuracy", description: "The entity obtains or generates, uses, and communicates relevant, quality information regarding the objectives related to processing to support the use of the products or services." },
  { controlId: "PI1.2", controlName: "System Inputs Validated", description: "The entity implements policies and procedures over system inputs that result in products, services, and reporting to meet the entity's objectives." },
  { controlId: "PI1.3", controlName: "Processing Outputs Complete and Accurate", description: "The entity implements policies and procedures over system processing to result in products, services, and reporting that are complete, valid, accurate, timely, and authorized." },
  { controlId: "PI1.4", controlName: "Output Distribution Management", description: "The entity implements policies and procedures to make available or deliver output completely, accurately, and timely in accordance with specifications to meet the entity's objectives." },
  { controlId: "PI1.5", controlName: "Stored Data Integrity", description: "The entity implements policies and procedures to store inputs, items in processing, and outputs completely, accurately, and timely in accordance with system specifications to meet the entity's objectives." },

  // P - Privacy
  { controlId: "P1.1", controlName: "Privacy Notice", description: "The entity provides notice to data subjects about its privacy practices to meet the entity's objectives related to privacy." },
  { controlId: "P2.1", controlName: "Consent and Choice", description: "The entity communicates choices available regarding the collection, use, retention, disclosure, and disposal of personal information to the data subjects." },
  { controlId: "P3.1", controlName: "Personal Information Collection", description: "Personal information is collected consistent with the entity's objectives related to privacy." },
  { controlId: "P4.1", controlName: "Personal Information Use and Retention", description: "The entity limits the use of personal information to the purposes identified in the entity's objectives related to privacy." },
  { controlId: "P5.1", controlName: "Personal Information Access", description: "The entity grants identified and authenticated data subjects the ability to access their stored personal information for review and, upon request, provides physical or electronic copies." },
  { controlId: "P6.1", controlName: "Personal Information Disclosure", description: "The entity discloses personal information to third parties with the consent of the data subjects and as described in the entity's privacy notice." },
  { controlId: "P7.1", controlName: "Personal Information Quality", description: "The entity collects and maintains accurate, up-to-date, complete, and relevant personal information to meet the entity's objectives related to privacy." },
  { controlId: "P8.1", controlName: "Privacy Complaints and Disputes", description: "The entity implements a process for receiving, addressing, resolving, and communicating the resolution of inquiries, complaints, and disputes from data subjects." },
];

const NDPR = [
  { controlId: "NDPR-2.1", controlName: "Lawful Processing of Personal Data", description: "Personal data shall be collected and processed in accordance with specific, legitimate, and lawful purpose consented to by the data subject. Processing without consent is only lawful if required by law or vital interests." },
  { controlId: "NDPR-2.2", controlName: "Data Subject Consent", description: "Consent of the data subject must be obtained through any appropriate method that is verifiable and accessible. Specific opt-in consent is required; silence or inactivity shall not constitute consent." },
  { controlId: "NDPR-2.3", controlName: "Legitimate Interest Basis", description: "Processing of personal data may be based on legitimate interest of the data controller or third party, provided that such interest is not overridden by the rights and freedoms of the data subject." },
  { controlId: "NDPR-2.4", controlName: "Purpose Limitation", description: "Personal data must not be further processed in a manner incompatible with the purpose for which it was collected. Any additional processing requires fresh consent or legal authorization." },
  { controlId: "NDPR-2.5", controlName: "Data Adequacy and Minimization", description: "Data collected should be adequate, relevant, and limited to the minimum necessary in relation to the purposes for which they are processed." },
  { controlId: "NDPR-2.6", controlName: "Storage Limitation", description: "Personal data shall be stored only for the period necessary for the purposes for which the data was collected. Retention policies must be established and enforced." },
  { controlId: "NDPR-2.7", controlName: "Data Accuracy", description: "Every reasonable step must be taken to ensure that personal data that is inaccurate, having regard to the purposes for which it is processed, is erased or rectified without delay." },
  { controlId: "NDPR-2.8", controlName: "Data Security and Integrity", description: "Personal data shall be secured against foreseeable hazards and breaches such as theft, cyberattack, viral attack, dissemination, manipulations of any kind, damage by rain, fire or exposure to other natural elements." },
  { controlId: "NDPR-2.9", controlName: "Accountability and Governance", description: "The data controller shall be responsible for, and be able to demonstrate compliance with the NDPR. This includes maintaining records of processing activities and conducting data protection impact assessments." },
  { controlId: "NDPR-2.10", controlName: "Data Protection Impact Assessment", description: "Where processing is likely to result in a high risk to the rights and freedoms of data subjects, the controller shall carry out a Data Protection Impact Assessment (DPIA) prior to the processing." },
  { controlId: "NDPR-3.1", controlName: "Rights of the Data Subject", description: "Data subjects have the right to request from the controller access to and rectification or erasure of personal data, restriction of processing, and the right to data portability." },
  { controlId: "NDPR-3.2", controlName: "Right to Information", description: "The data subject has the right to be informed about the collection and use of their personal data, including the purposes, retention periods, and third parties with access." },
  { controlId: "NDPR-3.3", controlName: "Right to Object", description: "The data subject shall have the right to object to the processing of personal data relating to him or her at any time, subject to certain conditions." },
  { controlId: "NDPR-3.4", controlName: "Right to Data Portability", description: "The data subject shall have the right to receive personal data concerning him or her in a structured, commonly used, and machine-readable format." },
  { controlId: "NDPR-3.5", controlName: "Right to Erasure (Right to Be Forgotten)", description: "The data subject shall have the right to obtain from the data controller the erasure of personal data concerning him or her without undue delay." },
  { controlId: "NDPR-4.1", controlName: "Data Protection Officer Appointment", description: "Every data controller or data processor shall designate a Data Protection Officer (DPO) who shall be registered with NITDA." },
  { controlId: "NDPR-4.2", controlName: "Data Breach Notification", description: "In the event of a personal data breach, the data controller shall within 72 hours of becoming aware of the breach, report the breach to NITDA and, where feasible, to the affected data subjects." },
  { controlId: "NDPR-4.3", controlName: "Third-Party Data Processing Agreements", description: "Where processing is to be carried out on behalf of a controller, the controller shall use only processors providing sufficient guarantees, governed by a binding contract." },
  { controlId: "NDPR-4.4", controlName: "International Data Transfers", description: "Transfer of personal data to a foreign country or international organization shall be subject to the supervision of the NITDA and only where adequate data protection levels are reciprocally guaranteed." },
  { controlId: "NDPR-4.5", controlName: "Audit File Requirement", description: "Every data controller and processor involved in processing personal data of more than 2,000 data subjects in a 6-month period shall submit a data protection audit to NITDA within 15 months and annually thereafter." },
  { controlId: "NDPR-5.1", controlName: "Privacy Policy Publication", description: "Data controllers and processors must display a prominent and accessible privacy policy on any medium through which personal data is collected." },
  { controlId: "NDPR-5.2", controlName: "Sensitive Personal Data Protections", description: "Processing of sensitive personal data (health, religion, political opinion, sexual orientation, genetic/biometric data) requires explicit written consent and additional safeguards." },
  { controlId: "NDPR-5.3", controlName: "Children's Data Protections", description: "Processing of personal data of children requires the consent of a parent or guardian. Additional protections apply including age verification mechanisms." },
  { controlId: "NDPR-5.4", controlName: "Remedies and Enforcement", description: "NITDA has the power to investigate complaints, conduct audits, and impose sanctions for violations. Penalties include fines of up to 2% of annual gross revenue or ₦10 million, whichever is greater." },
];

const CBN_IT = [
  // IT Governance
  { controlId: "CBN-IT-1.1", controlName: "IT Governance Framework", description: "Financial institutions shall establish an IT governance framework that aligns IT strategy with business objectives, ensuring proper oversight, accountability, and transparency in IT investments and operations." },
  { controlId: "CBN-IT-1.2", controlName: "IT Strategic Planning", description: "Banks shall develop and maintain an IT strategic plan that is aligned with the bank's business strategy and regularly reviewed by the Board or its committee." },
  { controlId: "CBN-IT-1.3", controlName: "IT Steering Committee", description: "Banks shall establish an IT Steering Committee responsible for overseeing IT strategy execution, project prioritization, and resource allocation." },
  { controlId: "CBN-IT-1.4", controlName: "IT Organization and Reporting Structure", description: "Banks shall maintain an IT organizational structure with clearly defined roles, responsibilities, and reporting lines. The Head of IT shall report to senior management." },
  { controlId: "CBN-IT-1.5", controlName: "IT Policies and Procedures", description: "Banks shall develop, implement, and maintain comprehensive IT policies and procedures covering all aspects of information technology management." },

  // IT Risk Management
  { controlId: "CBN-IT-2.1", controlName: "IT Risk Management Framework", description: "Banks shall establish an IT risk management framework to identify, assess, mitigate, and monitor IT-related risks on an ongoing basis." },
  { controlId: "CBN-IT-2.2", controlName: "IT Risk Assessment", description: "Banks shall conduct regular IT risk assessments covering all information assets, systems, and processes. Risk assessments shall be updated annually or upon significant changes." },
  { controlId: "CBN-IT-2.3", controlName: "Third-Party IT Risk Management", description: "Banks shall establish a process for managing risks associated with third-party IT service providers, including due diligence, contractual provisions, and ongoing monitoring." },
  { controlId: "CBN-IT-2.4", controlName: "IT Audit Function", description: "Banks shall establish an independent IT audit function to evaluate the effectiveness of IT controls, governance, and risk management processes." },

  // Information Security
  { controlId: "CBN-IT-3.1", controlName: "Information Security Policy", description: "Banks shall establish a comprehensive information security policy approved by the Board, covering data classification, access control, cryptography, and incident management." },
  { controlId: "CBN-IT-3.2", controlName: "Information Security Organization", description: "Banks shall designate a Chief Information Security Officer (CISO) responsible for information security management, reporting directly to the Head of IT or Chief Risk Officer." },
  { controlId: "CBN-IT-3.3", controlName: "Access Control and Identity Management", description: "Banks shall implement robust access control mechanisms including unique user identification, strong authentication, least privilege, and periodic access reviews." },
  { controlId: "CBN-IT-3.4", controlName: "Cryptographic Controls", description: "Banks shall implement cryptographic controls for data protection at rest and in transit, including key management procedures and approved cryptographic algorithms." },
  { controlId: "CBN-IT-3.5", controlName: "Security Monitoring and Incident Management", description: "Banks shall establish security monitoring capabilities and an incident response program including detection, reporting, escalation, containment, recovery, and lessons learned." },
  { controlId: "CBN-IT-3.6", controlName: "Network Security", description: "Banks shall implement network security measures including firewalls, IDS/IPS, network segmentation, DMZ architecture, and secure remote access." },
  { controlId: "CBN-IT-3.7", controlName: "Vulnerability Assessment and Penetration Testing", description: "Banks shall conduct vulnerability assessments quarterly and penetration testing annually at minimum, with findings addressed within defined remediation timelines." },
  { controlId: "CBN-IT-3.8", controlName: "Security Awareness and Training", description: "Banks shall establish a comprehensive security awareness program for all staff, including specialized training for IT personnel and management." },

  // IT Operations
  { controlId: "CBN-IT-4.1", controlName: "IT Service Management", description: "Banks shall implement IT service management practices aligned with industry frameworks such as ITIL, including incident, problem, and change management." },
  { controlId: "CBN-IT-4.2", controlName: "Change Management", description: "Banks shall implement a formal change management process for all changes to IT systems, applications, and infrastructure, including impact assessment and approval workflows." },
  { controlId: "CBN-IT-4.3", controlName: "Data Backup and Recovery", description: "Banks shall maintain comprehensive data backup and recovery procedures, including regular testing of backup restoration, offsite storage, and defined recovery time/point objectives." },
  { controlId: "CBN-IT-4.4", controlName: "Business Continuity and Disaster Recovery", description: "Banks shall establish and maintain comprehensive BCP/DRP plans including a disaster recovery site, regular testing (at least annually), and documented recovery procedures." },
  { controlId: "CBN-IT-4.5", controlName: "IT Asset Management", description: "Banks shall maintain an accurate and up-to-date inventory of all IT assets including hardware, software, licenses, and their configurations." },
  { controlId: "CBN-IT-4.6", controlName: "Capacity and Performance Management", description: "Banks shall monitor and manage IT capacity and performance to ensure systems meet current and projected business requirements." },

  // E-Banking and Digital Channels
  { controlId: "CBN-IT-5.1", controlName: "E-Banking Security", description: "Banks shall implement enhanced security controls for electronic banking channels including multi-factor authentication, transaction monitoring, session management, and fraud detection." },
  { controlId: "CBN-IT-5.2", controlName: "Mobile Banking Security", description: "Banks shall implement security controls specific to mobile banking including device registration, secure communication, app integrity, and transaction limits." },
  { controlId: "CBN-IT-5.3", controlName: "ATM and POS Security", description: "Banks shall implement security controls for ATM and POS operations including physical security, software integrity, encryption of cardholder data, and anti-skimming measures." },
  { controlId: "CBN-IT-5.4", controlName: "Internet Banking Security", description: "Banks shall implement security measures for internet banking platforms including SSL/TLS encryption, session timeout, CAPTCHA, and real-time fraud monitoring." },
  { controlId: "CBN-IT-5.5", controlName: "Open Banking and API Security", description: "Banks shall implement security controls for Open Banking APIs including OAuth 2.0 authentication, API rate limiting, data encryption, and consent management." },

  // Software Development
  { controlId: "CBN-IT-6.1", controlName: "Software Development Life Cycle", description: "Banks shall adopt a formal SDLC methodology incorporating security at each phase, including requirements, design, coding, testing, deployment, and maintenance." },
  { controlId: "CBN-IT-6.2", controlName: "Application Security Testing", description: "Banks shall perform security testing of applications including static code analysis, dynamic testing, and code review before deployment to production." },
  { controlId: "CBN-IT-6.3", controlName: "Production Environment Integrity", description: "Banks shall maintain separation of development, testing, and production environments with appropriate access controls and data protection measures." },

  // Data Management and Privacy
  { controlId: "CBN-IT-7.1", controlName: "Data Classification and Handling", description: "Banks shall implement a data classification scheme and ensure appropriate handling, storage, and disposal procedures based on data sensitivity levels." },
  { controlId: "CBN-IT-7.2", controlName: "Customer Data Protection", description: "Banks shall implement measures to protect customer data in compliance with the NDPR and CBN consumer protection regulations, including data minimization and consent management." },
  { controlId: "CBN-IT-7.3", controlName: "Data Retention and Disposal", description: "Banks shall establish data retention policies aligned with regulatory requirements and implement secure data disposal procedures to prevent unauthorized recovery." },

  // Regulatory Compliance and Reporting
  { controlId: "CBN-IT-8.1", controlName: "IT Compliance Monitoring", description: "Banks shall continuously monitor compliance with CBN IT standards, circulars, and guidelines, and promptly address any identified gaps." },
  { controlId: "CBN-IT-8.2", controlName: "IT Incident Reporting to CBN", description: "Banks shall report significant IT security incidents to the CBN within 24 hours of detection, including breaches affecting customer data, system outages exceeding defined thresholds, and cyber attacks." },
  { controlId: "CBN-IT-8.3", controlName: "IT Examination Readiness", description: "Banks shall maintain documentation and evidence of IT controls implementation to facilitate CBN examination and supervisory reviews." },
  { controlId: "CBN-IT-8.4", controlName: "Cloud Computing Compliance", description: "Banks shall comply with CBN guidelines on cloud computing adoption, including risk assessment, data residency requirements, and ensuring adequate contractual protections." },
];

// ══════════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════════

const FRAMEWORKS = [
  { key: "ISO_27001", label: "ISO 27001:2022", controls: ISO_27001 },
  { key: "NIST_CSF", label: "NIST CSF 2.0", controls: NIST_CSF },
  { key: "COBIT", label: "COBIT 2019", controls: COBIT },
  { key: "PCI_DSS", label: "PCI DSS 4.0", controls: PCI_DSS },
  { key: "SOC2", label: "SOC 2", controls: SOC2 },
  { key: "NDPR", label: "NDPR", controls: NDPR },
  { key: "CBN_IT_GUIDELINES", label: "CBN IT Guidelines", controls: CBN_IT },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  GRC Compliance Standards Seeder");
  console.log("═══════════════════════════════════════════════════════\n");

  // Login
  console.log("Authenticating...");
  const token = await login();
  console.log("Authenticated successfully.\n");

  let totalCreated = 0;
  let totalFailed = 0;

  for (const fw of FRAMEWORKS) {
    console.log(`\n── ${fw.label} (${fw.controls.length} controls) ──`);
    let created = 0;
    let failed = 0;

    for (const ctrl of fw.controls) {
      const ok = await createControl(token, {
        framework: fw.key,
        controlId: ctrl.controlId,
        controlName: ctrl.controlName,
        description: ctrl.description,
      });
      if (ok) created++;
      else failed++;
    }

    console.log(`  Created: ${created} | Failed: ${failed}`);
    totalCreated += created;
    totalFailed += failed;
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`  Total: ${totalCreated} created, ${totalFailed} failed`);
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

// ──────────────────────────────────────────────
// SSA Module Types
// Storage/Server Allocation and Additional Space Request
// ──────────────────────────────────────────────

export interface SSARequest {
  id: string;
  tenantId: string;
  referenceNo: string;
  requestorId: string;
  requestorName: string;
  requestorStaffId: string;
  requestorEmail: string;
  requestorStatus?: string;
  divisionOffice: string;
  status: string;
  extension?: string;
  appName: string;
  dbName: string;
  operatingSystem: string;
  serverType: string;
  vcpuCount: number;
  memoryGb: number;
  diskCount?: number;
  spaceGb: number;
  vlanZone: string;
  specialRequirements?: string;
  justification: string;
  presentSpaceAllocatedGb: number;
  presentSpaceInUseGb: number;
  revisionCount: number;
  rejectedStage?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceImpact {
  id: string;
  requestId: string;
  riskCategory: string;
  riskDescription: string;
  mitigationMeasures: string;
  severity: string;
  sequenceOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SSAApproval {
  id: string;
  requestId: string;
  stage: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: string;
  remarks?: string;
  decidedAt: string;
  delegatedFromId?: string;
  slaTargetAt: string;
  slaBreached: boolean;
  createdAt: string;
}

export interface ASDAssessment {
  id: string;
  requestId: string;
  assessorId: string;
  assessmentOutcome: string;
  osCompatibilityCheck: boolean;
  resourceAdequacyCheck: boolean;
  securityComplianceCheck: boolean;
  haFeasibilityCheck: boolean;
  conditions?: string;
  technicalNotes?: string;
  assessedAt: string;
}

export interface QCMDAnalysis {
  id: string;
  requestId: string;
  analystId: string;
  serverReference: string;
  availableStorageTb: number;
  spaceRequestedGb: number;
  storageAfterAllocationTb: number;
  justificationNotes?: string;
  analysedAt: string;
}

export interface SANProvisioning {
  id: string;
  requestId: string;
  administratorId: string;
  port: string;
  cu: string;
  ldev: string;
  lun: string;
  acp: string;
  sizeAllocated: string;
  hbaType?: string;
  hbaDriverVersion?: string;
  wwnNo?: string;
  hostName?: string;
  sanSwitchNoPort?: string;
  sanSwitchZoneName?: string;
  remarks?: string;
  provisionedAt: string;
}

export interface DCOServer {
  id: string;
  requestId: string;
  creatorId: string;
  creatorName: string;
  creatorStaffId: string;
  serverName: string;
  ipAddress: string;
  zone: string;
  createdServerAt: string;
}

export interface SSAAuditLog {
  id: number;
  requestId: string;
  eventType: string;
  fromState?: string;
  toState?: string;
  actorId: string;
  actorName: string;
  description: string;
  metadataJson?: Record<string, unknown>;
  ipAddress?: string;
  occurredAt: string;
}

export interface SSADelegation {
  id: string;
  tenantId: string;
  delegatorId: string;
  delegateId: string;
  stage: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SSARequestDetail extends SSARequest {
  serviceImpacts: ServiceImpact[];
  approvals: SSAApproval[];
  asdAssessment?: ASDAssessment;
  qcmdAnalysis?: QCMDAnalysis;
  sanProvisioning?: SANProvisioning;
  dcoServer?: DCOServer;
}

export interface SSARequestStats {
  total: number;
  draft: number;
  submitted: number;
  inProgress: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
}

// ──────────────────────────────────────────────
// Enum constants
// ──────────────────────────────────────────────

export const SSA_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "HOO_ENDORSED",
  "ASD_ASSESSED",
  "QCMD_ANALYSED",
  "APPR_DC_PENDING",
  "APPR_SSO_PENDING",
  "APPR_IMD_PENDING",
  "APPR_ASD_PENDING",
  "APPR_SCAO_PENDING",
  "FULLY_APPROVED",
  "SAN_PROVISIONED",
  "DCO_CREATED",
  "REJECTED",
  "CANCELLED",
] as const;

export const SSA_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  HOO_ENDORSED: "Endorsed by HOO",
  ASD_ASSESSED: "ASD Assessment Complete",
  QCMD_ANALYSED: "QCMD Analysis Complete",
  APPR_DC_PENDING: "Awaiting Head Data Centre",
  APPR_SSO_PENDING: "Awaiting Head SSO",
  APPR_IMD_PENDING: "Awaiting Head IMD",
  APPR_ASD_PENDING: "Awaiting Head ASD",
  APPR_SCAO_PENDING: "Awaiting Head SCAO",
  FULLY_APPROVED: "Fully Approved",
  SAN_PROVISIONED: "SAN Provisioned",
  DCO_CREATED: "Server Created",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  // Approval stage labels (used by ApprovalsTab and rejected-stage display)
  HOO_ENDORSEMENT: "HOO Endorsement",
  ASD_ASSESSMENT: "ASD Assessment",
  QCMD_ANALYSIS: "QCMD Analysis",
  APPR_DC: "Head Data Centre",
  APPR_SSO: "Head SSO",
  APPR_IMD: "Head IMD",
  APPR_ASD: "Head ASD",
  APPR_SCAO: "Head SCAO",
  SAN_PROVISIONING: "SAN Provisioning",
  DCO_SERVER: "DCO Server",
};

export const SSA_STATUS_COLORS: Record<string, string> = {
  DRAFT: "neutral",
  SUBMITTED: "blue",
  HOO_ENDORSED: "blue",
  ASD_ASSESSED: "blue",
  QCMD_ANALYSED: "blue",
  APPR_DC_PENDING: "amber",
  APPR_SSO_PENDING: "amber",
  APPR_IMD_PENDING: "amber",
  APPR_ASD_PENDING: "amber",
  APPR_SCAO_PENDING: "amber",
  FULLY_APPROVED: "green",
  SAN_PROVISIONED: "teal",
  DCO_CREATED: "green",
  REJECTED: "red",
  CANCELLED: "neutral",
};

export const RISK_CATEGORIES = [
  { value: "AUTHENTICATION", label: "Authentication" },
  { value: "AVAILABILITY", label: "Availability" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "DATA_INTEGRITY", label: "Data Integrity" },
];

export const SEVERITY_LEVELS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export const OPERATING_SYSTEMS = [
  { value: "Red Hat Enterprise Linux 8.x", label: "RHEL 8.x" },
  { value: "Red Hat Enterprise Linux 9.x", label: "RHEL 9.x" },
  { value: "CentOS Stream 8", label: "CentOS Stream 8" },
  { value: "CentOS Stream 9", label: "CentOS Stream 9" },
  { value: "Ubuntu Server 20.04 LTS", label: "Ubuntu 20.04 LTS" },
  { value: "Ubuntu Server 22.04 LTS", label: "Ubuntu 22.04 LTS" },
  { value: "Oracle Linux 8.x", label: "Oracle Linux 8.x" },
  { value: "Oracle Linux 9.x", label: "Oracle Linux 9.x" },
];

export const SERVER_TYPES = [
  { value: "DB", label: "Database" },
  { value: "APP", label: "Application" },
  { value: "WEB", label: "Web" },
];

export const VLAN_ZONES = [
  { value: "Internal VLAN (Secure)", label: "Internal VLAN (Secure)" },
  { value: "DMZ VLAN", label: "DMZ VLAN" },
  { value: "Management VLAN", label: "Management VLAN" },
  { value: "Backup VLAN", label: "Backup VLAN" },
];

export const REQUESTOR_STATUSES = [
  // Junior & Clerical Cadres
  { value: "GL.14", label: "Motor Driver & Equivalent – GL 14", group: "Junior & Clerical Cadres" },
  { value: "GL.13", label: "Clerk & Equivalent – GL 13", group: "Junior & Clerical Cadres" },
  { value: "GL.11", label: "Senior Clerk & Equivalent – GL 11", group: "Junior & Clerical Cadres" },
  // Supervisory Cadres
  { value: "GL.10", label: "Supervisor & Equivalent – GL 10", group: "Supervisory Cadres" },
  { value: "GL.09", label: "Senior Supervisor II & Equivalent – GL 09", group: "Supervisory Cadres" },
  { value: "GL.08", label: "Senior Supervisor & Equivalent – GL 08", group: "Supervisory Cadres" },
  // Management Transition Cadres
  { value: "GL.07", label: "Assistant Manager & Equivalent – GL 07", group: "Management Transition Cadres" },
  { value: "GL.06", label: "Deputy Manager – GL 06", group: "Management Transition Cadres" },
  { value: "GL.05", label: "Manager & Equivalent – GL 05", group: "Management Transition Cadres" },
  // Senior Management
  { value: "GL.04", label: "Senior Manager & Equivalent – GL 04", group: "Senior Management" },
  { value: "GL.39", label: "Principal Manager – GL 39", group: "Senior Management" },
  { value: "GL.03", label: "Assistant Director – GL 03", group: "Senior Management" },
  { value: "GL.02", label: "Deputy Director – GL 02", group: "Senior Management" },
  { value: "GL.01", label: "Director – GL 01", group: "Senior Management" },
];

export const ASSESSMENT_OUTCOMES = [
  { value: "FEASIBLE", label: "Feasible" },
  { value: "CONDITIONALLY_FEASIBLE", label: "Conditionally Feasible" },
  { value: "NOT_FEASIBLE", label: "Not Feasible" },
];

// ──────────────────────────────────────────────
// Bulk operation types
// ──────────────────────────────────────────────

export interface BulkOperationResult {
  requestId: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationSummary {
  totalRequested: number;
  succeeded: number;
  failed: number;
  results: BulkOperationResult[];
}

export interface ExportedRequest extends SSARequest {
  serviceImpacts: ServiceImpact[];
  approvals: SSAApproval[];
  asdAssessment?: ASDAssessment;
  qcmdAnalysis?: QCMDAnalysis;
  sanProvisioning?: SANProvisioning;
  dcoServer?: DCOServer;
}

export const APPROVAL_STAGES = [
  { value: "APPR_DC", label: "Head Data Centre" },
  { value: "APPR_SSO", label: "Head SSO" },
  { value: "APPR_IMD", label: "Head IMD" },
  { value: "APPR_ASD", label: "Head ASD" },
  { value: "APPR_SCAO", label: "Head SCAO" },
];

// Workflow stages in order for timeline display
export const WORKFLOW_STAGES = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "HOO_ENDORSED", label: "HOO Endorsement" },
  { key: "ASD_ASSESSED", label: "ASD Assessment" },
  { key: "QCMD_ANALYSED", label: "QCMD Analysis" },
  { key: "APPR_DC_PENDING", label: "Head Data Centre" },
  { key: "APPR_SSO_PENDING", label: "Head SSO" },
  { key: "APPR_IMD_PENDING", label: "Head IMD" },
  { key: "APPR_ASD_PENDING", label: "Head ASD" },
  { key: "APPR_SCAO_PENDING", label: "Head SCAO" },
  { key: "FULLY_APPROVED", label: "Fully Approved" },
  { key: "SAN_PROVISIONED", label: "SAN Provisioned" },
  { key: "DCO_CREATED", label: "Server Created" },
];

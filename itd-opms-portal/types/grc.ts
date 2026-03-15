/* ====================================================================== */
/*  GRC & Audit Readiness — Canonical Enum Constants                       */
/*                                                                          */
/*  These values mirror the Go backend constants in                         */
/*  itd-opms-api/internal/modules/grc/types.go exactly.                    */
/*  Always use these constants instead of raw strings to prevent drift.     */
/* ====================================================================== */

// ── Risk ──────────────────────────────────────────────────────────────────
export const RISK_STATUS = {
  IDENTIFIED: "identified",
  ASSESSED: "assessed",
  MITIGATING: "mitigating",
  ACCEPTED: "accepted",
  ESCALATED: "escalated",
  CLOSED: "closed",
} as const;
export type RiskStatus = (typeof RISK_STATUS)[keyof typeof RISK_STATUS];

export const RISK_LIKELIHOOD = {
  VERY_LOW: "very_low",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  VERY_HIGH: "very_high",
} as const;
export type RiskLikelihood = (typeof RISK_LIKELIHOOD)[keyof typeof RISK_LIKELIHOOD];

export const RISK_IMPACT = {
  VERY_LOW: "very_low",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  VERY_HIGH: "very_high",
} as const;
export type RiskImpact = (typeof RISK_IMPACT)[keyof typeof RISK_IMPACT];

export const RISK_CATEGORY = {
  OPERATIONAL: "operational",
  STRATEGIC: "strategic",
  FINANCIAL: "financial",
  COMPLIANCE: "compliance",
  TECHNOLOGY: "technology",
  SECURITY: "security",
  REPUTATION: "reputation",
} as const;
export type RiskCategory = (typeof RISK_CATEGORY)[keyof typeof RISK_CATEGORY];

// ── Audit ─────────────────────────────────────────────────────────────────
export const AUDIT_TYPE = {
  INTERNAL: "internal",
  EXTERNAL: "external",
  REGULATORY: "regulatory",
} as const;
export type AuditType = (typeof AUDIT_TYPE)[keyof typeof AUDIT_TYPE];

export const AUDIT_STATUS = {
  PLANNED: "planned",
  PREPARING: "preparing",
  IN_PROGRESS: "in_progress",
  FINDINGS_REVIEW: "findings_review",
  COMPLETED: "completed",
} as const;
export type AuditStatus = (typeof AUDIT_STATUS)[keyof typeof AUDIT_STATUS];

// ── Finding ───────────────────────────────────────────────────────────────
export const FINDING_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type FindingSeverity = (typeof FINDING_SEVERITY)[keyof typeof FINDING_SEVERITY];

export const FINDING_STATUS = {
  OPEN: "open",
  REMEDIATION_PLANNED: "remediation_planned",
  IN_REMEDIATION: "in_remediation",
  CLOSED: "closed",
  ACCEPTED: "accepted",
} as const;
export type FindingStatus = (typeof FINDING_STATUS)[keyof typeof FINDING_STATUS];

// ── Evidence Collection ───────────────────────────────────────────────────
export const EVIDENCE_STATUS = {
  PENDING: "pending",
  COLLECTING: "collecting",
  REVIEW: "review",
  APPROVED: "approved",
  SUBMITTED: "submitted",
} as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUS)[keyof typeof EVIDENCE_STATUS];

// ── Access Review ─────────────────────────────────────────────────────────
export const ACCESS_REVIEW_STATUS = {
  PLANNED: "planned",
  ACTIVE: "active",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;
export type AccessReviewStatus = (typeof ACCESS_REVIEW_STATUS)[keyof typeof ACCESS_REVIEW_STATUS];

export const REVIEW_DECISION = {
  APPROVED: "approved",
  REVOKED: "revoked",
  EXCEPTION: "exception",
} as const;
export type ReviewDecision = (typeof REVIEW_DECISION)[keyof typeof REVIEW_DECISION];

// ── Compliance ────────────────────────────────────────────────────────────
export const COMPLIANCE_FRAMEWORK = {
  ISO_27001: "ISO_27001",
  NIST_CSF: "NIST_CSF",
  COBIT: "COBIT",
  PCI_DSS: "PCI_DSS",
  SOC2: "SOC2",
  NDPR: "NDPR",
  CBN_IT_GUIDELINES: "CBN_IT_GUIDELINES",
} as const;
export type ComplianceFramework = (typeof COMPLIANCE_FRAMEWORK)[keyof typeof COMPLIANCE_FRAMEWORK];

export const COMPLIANCE_IMPL_STATUS = {
  NOT_STARTED: "not_started",
  PARTIAL: "partial",
  IMPLEMENTED: "implemented",
  VERIFIED: "verified",
} as const;
export type ComplianceImplStatus =
  (typeof COMPLIANCE_IMPL_STATUS)[keyof typeof COMPLIANCE_IMPL_STATUS];

/* ====================================================================== */
/*  GRC Domain Types                                                        */
/* ====================================================================== */

export interface GRCRisk {
  id: string;
  tenantId: string;
  riskNumber: string;
  title: string;
  description?: string;
  category: RiskCategory | string;
  likelihood: RiskLikelihood | string;
  impact: RiskImpact | string;
  riskScore: number;
  status: RiskStatus | string;
  treatmentPlan?: string;
  contingencyPlan?: string;
  ownerId?: string;
  reviewerId?: string;
  reviewDate?: string;
  nextReviewDate?: string;
  linkedProjectId?: string;
  linkedAuditId?: string;
  escalationThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAssessment {
  id: string;
  riskId: string;
  assessedBy: string;
  assessmentDate: string;
  previousLikelihood?: string;
  previousImpact?: string;
  newLikelihood: string;
  newImpact: string;
  rationale?: string;
  evidenceRefs: string[];
  createdAt: string;
}

export interface RiskHeatMapEntry {
  likelihood: string;
  impact: string;
  count: number;
}

export interface GRCAudit {
  id: string;
  tenantId: string;
  title: string;
  auditType: AuditType | string;
  scope?: string;
  auditor?: string;
  auditBody?: string;
  status: AuditStatus | string;
  scheduledStart?: string;
  scheduledEnd?: string;
  /** Free-form JSON stored as JSONB in the DB. Treat as opaque unless the
   *  application defines a specific schema for evidence requirement objects. */
  evidenceRequirements?: Array<Record<string, unknown>> | null;
  readinessScore: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFinding {
  id: string;
  auditId: string;
  tenantId: string;
  findingNumber: string;
  title: string;
  description?: string;
  severity: FindingSeverity | string;
  status: FindingStatus | string;
  remediationPlan?: string;
  ownerId?: string;
  dueDate?: string;
  closedAt?: string;
  evidenceOfRemediation: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceCollection {
  id: string;
  auditId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: EvidenceStatus | string;
  evidenceItemIds: string[];
  collectorId?: string;
  reviewerId?: string;
  approvedAt?: string;
  checksum?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessReviewCampaign {
  id: string;
  tenantId: string;
  title: string;
  scope?: string;
  status: AccessReviewStatus | string;
  reviewerIds: string[];
  dueDate?: string;
  completionRate: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessReviewEntry {
  id: string;
  campaignId: string;
  tenantId: string;
  userId: string;
  roleId?: string;
  reviewerId?: string;
  decision?: ReviewDecision | string;
  justification?: string;
  exceptionExpiry?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ComplianceControl {
  id: string;
  tenantId: string;
  framework: ComplianceFramework | string;
  controlId: string;
  controlName: string;
  description?: string;
  implementationStatus: ComplianceImplStatus | string;
  evidenceRefs: string[];
  ownerId?: string;
  lastAssessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceStats {
  framework: string;
  total: number;
  compliantCount: number;
}

/* ====================================================================== */
/*  GRC Request DTOs                                                        */
/*                                                                          */
/*  These mirror the Go request structs in types.go. Using these instead   */
/*  of Partial<DomainType> prevents sending server-computed fields          */
/*  (id, riskScore, riskNumber, createdAt, updatedAt) to the API.          */
/* ====================================================================== */

export interface CreateRiskRequest {
  title: string;
  description?: string;
  category: string;
  likelihood: string;
  impact: string;
  status: string;
  treatmentPlan?: string;
  contingencyPlan?: string;
  ownerId?: string;
  reviewerId?: string;
  reviewDate?: string;
  nextReviewDate?: string;
  linkedProjectId?: string;
  linkedAuditId?: string;
  escalationThreshold?: number;
}

export type UpdateRiskRequest = Partial<CreateRiskRequest>;

export interface CreateRiskAssessmentRequest {
  newLikelihood: string;
  newImpact: string;
  rationale?: string;
  evidenceRefs?: string[];
}

export interface CreateGRCAuditRequest {
  title: string;
  auditType: string;
  scope?: string;
  auditor?: string;
  auditBody?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  evidenceRequirements?: Array<Record<string, unknown>> | null;
}

export interface UpdateGRCAuditRequest extends Partial<CreateGRCAuditRequest> {
  status?: string;
  readinessScore?: number;
}

export interface CreateAuditFindingRequest {
  title: string;
  description?: string;
  severity: string;
  remediationPlan?: string;
  ownerId?: string;
  dueDate?: string;
}

export interface UpdateAuditFindingRequest extends Partial<CreateAuditFindingRequest> {
  status?: string;
}

export interface CreateEvidenceCollectionRequest {
  title: string;
  description?: string;
  evidenceItemIds?: string[];
  collectorId?: string;
}

export interface UpdateEvidenceCollectionRequest
  extends Partial<CreateEvidenceCollectionRequest> {
  status?: string;
  reviewerId?: string;
  checksum?: string;
}

export interface CreateAccessReviewCampaignRequest {
  title: string;
  scope?: string;
  reviewerIds?: string[];
  dueDate?: string;
}

export interface UpdateAccessReviewCampaignRequest
  extends Partial<CreateAccessReviewCampaignRequest> {
  status?: string;
}

export interface RecordAccessReviewDecisionRequest {
  decision: string;
  justification?: string;
  exceptionExpiry?: string;
}

export interface CreateComplianceControlRequest {
  framework: string;
  controlId: string;
  controlName: string;
  description?: string;
  ownerId?: string;
}

export interface UpdateComplianceControlRequest {
  controlName?: string;
  description?: string;
  implementationStatus?: string;
  evidenceRefs?: string[];
  ownerId?: string;
}

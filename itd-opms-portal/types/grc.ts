/* ====================================================================== */
/*  GRC & Audit Readiness Types                                             */
/* ====================================================================== */

export interface GRCRisk {
  id: string;
  tenantId: string;
  riskNumber: string;
  title: string;
  description?: string;
  category: string;
  likelihood: string;
  impact: string;
  riskScore: number;
  status: string;
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
  auditType: string;
  scope?: string;
  auditor?: string;
  auditBody?: string;
  status: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  evidenceRequirements?: unknown[];
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
  severity: string;
  status: string;
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
  status: string;
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
  status: string;
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
  decision?: string;
  justification?: string;
  exceptionExpiry?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ComplianceControl {
  id: string;
  tenantId: string;
  framework: string;
  controlId: string;
  controlName: string;
  description?: string;
  implementationStatus: string;
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

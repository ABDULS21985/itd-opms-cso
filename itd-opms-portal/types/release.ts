/* =================================================================
   Release Management — TypeScript Types & Constants
   ================================================================= */

// ──────────────────────────────────────────────
// Release entity
// ──────────────────────────────────────────────

export interface Release {
  id: string;
  tenantId: string;
  releaseNumber: string;
  title: string;
  description: string;
  releaseType: string;
  status: string;
  environment: string;
  releaseManagerId?: string;
  releaseManagerName?: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  deploymentPlan?: string;
  rollbackPlan?: string;
  riskLevel?: string;
  riskNotes?: string;
  closeOutReport?: string;
  lessonsLearned?: string;
  closeOutNotes?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Release items (software, hardware, config)
// ──────────────────────────────────────────────

export interface ReleaseItem {
  id: string;
  releaseId: string;
  title: string;
  itemType: string;
  status: string;
  ciId?: string;
  ciName?: string;
  version?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Release deployments
// ──────────────────────────────────────────────

export interface ReleaseDeployment {
  id: string;
  releaseId: string;
  environment: string;
  status: string;
  deployedBy?: string;
  deployedByName?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Release approvals (sign-offs)
// ──────────────────────────────────────────────

export interface ReleaseApproval {
  id: string;
  releaseId: string;
  approvalType: string;
  status: string;
  approverName?: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
  comments?: string;
  notes?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Aggregates
// ──────────────────────────────────────────────

export interface ReleaseStats {
  total: number;
  inProgress: number;
  deployedThisMonth: number;
  rollbackRate: number;
}

export interface ReleaseCalendarEvent {
  id: string;
  title: string;
  eventType: string;
  releaseType?: string;
  status: string;
  environment?: string;
  startTime: string;
  endTime: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

export const RELEASE_TYPES = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
  { value: "patch", label: "Patch" },
  { value: "emergency", label: "Emergency" },
] as const;

export const RELEASE_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "build", label: "Build" },
  { value: "testing", label: "Testing" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "deploying", label: "Deploying" },
  { value: "deployed", label: "Deployed" },
  { value: "rolled_back", label: "Rolled Back" },
  { value: "closed", label: "Closed" },
] as const;

export const RELEASE_ENVIRONMENTS = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
] as const;

export const RELEASE_ITEM_TYPES = [
  { value: "software", label: "Software" },
  { value: "hardware", label: "Hardware" },
  { value: "configuration", label: "Configuration" },
  { value: "documentation", label: "Documentation" },
] as const;

export const RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const APPROVAL_TYPES = [
  { value: "uat_signoff", label: "UAT Sign-off" },
  { value: "security_clearance", label: "Security Review" },
  { value: "ditd_approval", label: "DITD Approval" },
  { value: "operational_readiness", label: "Ops Readiness" },
] as const;

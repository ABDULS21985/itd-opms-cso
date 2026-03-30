/* ------------------------------------------------------------------ */
/*  ITSM Module Types                                                   */
/* ------------------------------------------------------------------ */

export interface CatalogCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  tenantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  fulfillmentWorkflowId?: string;
  approvalRequired: boolean;
  approvalChainConfig?: Record<string, unknown>;
  slaPolicyId?: string;
  formSchema?: Record<string, unknown>;
  entitlementRoles: string[];
  estimatedDelivery?: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  type: string;
  category?: string;
  subcategory?: string;
  title: string;
  description: string;
  priority: string;
  urgency: string;
  impact: string;
  status: string;
  channel: string;
  reporterId: string;
  assigneeId?: string;
  teamQueueId?: string;
  slaPolicyId?: string;
  slaResponseTarget?: string;
  slaResolutionTarget?: string;
  slaResponseMet?: boolean;
  slaResolutionMet?: boolean;
  slaPausedAt?: string;
  slaPausedDurationMinutes: number;
  isMajorIncident: boolean;
  relatedTicketIds: string[];
  linkedProblemId?: string;
  linkedAssetIds: string[];
  orgUnitId?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  closedAt?: string;
  firstResponseAt?: string;
  satisfactionScore?: number;
  tags: string[];
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Change-specific fields (populated only when type = "change")
  changeClassification?: string;
  changeType?: string;
  riskLevel?: string;
  riskAssessment?: Record<string, unknown>;
  implementationPlan?: string;
  rollbackPlan?: string;
  testPlan?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  cabRequired: boolean;
  cabMeetingId?: string;
  cabDecision?: string;
  cabDecisionDate?: string;
  pirRequired: boolean;
  pirCompleted: boolean;
  pirNotes?: string;
  cabNotes?: string;
  changeSuccess?: boolean;
  // Enrichment fields (from JOINs)
  reporterName?: string;
  reporterDepartment?: string;
  assigneeName?: string;
  assigneeDepartment?: string;
  teamQueueName?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  attachments: string[];
  createdAt: string;
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface TicketStats {
  total: number;
  openCount: number;
  slaBreachedCount: number;
  majorIncidents: number;
}

export interface SLAPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  priorityTargets: Record<string, { response_minutes: number; resolution_minutes: number }>;
  businessHoursCalendarId?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHoursCalendar {
  id: string;
  tenantId: string;
  name: string;
  timezone: string;
  schedule: Record<string, { start: string; end: string }>;
  holidays: Array<{ date: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface SLABreachEntry {
  id: string;
  ticketId: string;
  breachType: string;
  breachedAt: string;
  targetWas: string;
  actualDurationMinutes?: number;
  createdAt: string;
}

export interface SLAComplianceStats {
  totalTickets: number;
  responseMet: number;
  resolutionMet: number;
}

export interface EscalationRule {
  id: string;
  tenantId: string;
  name: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  escalationChain?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITSMProblem {
  id: string;
  tenantId: string;
  problemNumber: string;
  title: string;
  description?: string;
  rootCause?: string;
  status: string;
  linkedIncidentIds: string[];
  workaround?: string;
  permanentFix?: string;
  linkedChangeId?: string;
  ownerId?: string;
  assignedGroupId?: string;
  createdAt: string;
  updatedAt: string;
  // Enrichment
  assignedGroupName?: string;
  ownerName?: string;
}

export interface KnownError {
  id: string;
  problemId: string;
  title: string;
  description?: string;
  workaround?: string;
  kbArticleId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportQueue {
  id: string;
  tenantId: string;
  name: string;
  teamId?: string;
  priorityFilter: string[];
  autoAssignRule: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CSATSurvey {
  id: string;
  ticketId: string;
  respondentId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CSATStats {
  total: number;
  avgRating: number;
}

/* ------------------------------------------------------------------ */
/*  Change Management Types                                            */
/* ------------------------------------------------------------------ */

export interface CABMeeting {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  scheduledDate: string;
  status: string;
  chairId?: string;
  attendees: string[];
  minutes?: string;
  decisions: Record<string, unknown>[];
  durationMinutes?: number;
  location?: string;
  meetingType: string;
  secretaryUserId?: string;
  agenda?: Record<string, unknown>[];
  changeTicketIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeStats {
  total: number;
  emergency: number;
  standard: number;
  normal: number;
  pendingCab: number;
  implementing: number;
  pendingPir: number;
}

export interface ChangeCalendarEvent {
  id: string;
  title: string;
  eventType: "change" | "freeze" | "maintenance";
  classification?: string;
  riskLevel?: string;
  status: string;
  startTime: string;
  endTime: string;
}

/* ------------------------------------------------------------------ */
/*  Change Management Constants                                        */
/* ------------------------------------------------------------------ */

export const CHANGE_CLASSIFICATIONS = [
  { value: "emergency", label: "Emergency" },
  { value: "standard", label: "Standard" },
  { value: "normal", label: "Normal" },
] as const;

export const CHANGE_TYPES = [
  { value: "application", label: "Application" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "network", label: "Network" },
  { value: "security", label: "Security" },
] as const;

export const RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export const CAB_DECISIONS = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "deferred", label: "Deferred" },
  { value: "conditionally_approved", label: "Conditionally Approved" },
] as const;

/* ------------------------------------------------------------------ */
/*  OLA / UC / Dependency Chain Types                                   */
/* ------------------------------------------------------------------ */

export interface OperationalLevelAgreement {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  supportTeamId?: string;
  supportTeamName?: string;
  serviceCatalogItemId?: string;
  parentSlaId?: string;
  parentSlaName?: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  businessHoursCalendarId?: string;
  escalationContactId?: string;
  escalationContactName?: string;
  status: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnderpinningContract {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  vendorId?: string;
  vendorName?: string;
  contractId?: string;
  contractTitle?: string;
  parentSlaId?: string;
  parentSlaName?: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  penaltyClause?: string;
  status: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SLADependencyChainEntry {
  id: string;
  slaPolicyId: string;
  slaPolicyName?: string;
  slaResponseMinutes?: number;
  slaResolutionMinutes?: number;
  olaId?: string;
  olaName?: string;
  olaResponseMinutes?: number;
  olaResolutionMinutes?: number;
  ucId?: string;
  ucName?: string;
  ucResponseMinutes?: number;
  ucResolutionMinutes?: number;
  notes?: string;
  createdAt: string;
}

export interface ConsistencyViolation {
  type: string;
  entityId: string;
  entityName: string;
  parentSlaId: string;
  field: string;
  slaTargetMinutes: number;
  entityTargetMinutes: number;
}

export interface ExpiringAgreements {
  olas: OperationalLevelAgreement[];
  ucs: UnderpinningContract[];
  days: number;
}

export const OLA_UC_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
] as const;

export const CHANGE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "assessing", label: "Assessing" },
  { value: "cab_review", label: "CAB Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "deferred", label: "Deferred" },
  { value: "scheduled", label: "Scheduled" },
  { value: "implementing", label: "Implementing" },
  { value: "implemented", label: "Implemented" },
  { value: "failed", label: "Failed" },
  { value: "rolled_back", label: "Rolled Back" },
  { value: "pir_pending", label: "PIR Pending" },
  { value: "closed", label: "Closed" },
  { value: "investigating", label: "Investigating" },
] as const;

/* ------------------------------------------------------------------ */
/*  KB ↔ Ticket Link Types                                             */
/* ------------------------------------------------------------------ */

export interface TicketKBLink {
  id: string;
  ticketId: string;
  articleId: string;
  linkedBy: string;
  linkType: "reference" | "resolution" | "workaround";
  createdAt: string;
  articleTitle: string;
  articleSlug: string;
  articleStatus: string;
  articleType: string;
  linkedByName: string;
}

export interface KBSuggestion {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  viewCount: number;
  helpfulCount: number;
  rank: number;
}

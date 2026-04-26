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
  reporterEmail?: string;
  emailThreadId?: string;
  emailMessageIds?: string[];
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
  linkedCiIds?: string[];
  orgUnitId?: string;
  parentTicketId?: string;
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
  majorIncidentRecordId?: string;
  majorIncidentStatus?: string;
  majorIncidentSeverity?: string;
  subtaskCount?: number;
  parentTicketNumber?: string;
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

export interface UserSummary {
  id: string;
  displayName: string;
  email?: string;
}

export interface AddCommentPayload {
  content: string;
  isInternal?: boolean;
}

export interface UpdateTicketPayload {
  category?: string;
  subcategory?: string;
  title?: string;
  description?: string;
  priority?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface TicketStats {
  total: number;
  openCount: number;
  slaBreachedCount: number;
  majorIncidents: number;
}

export interface SubtaskSummary {
  id: string;
  ticketNumber: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
}

export interface SubtaskProgress {
  total: number;
  completed: number;
  cancelled: number;
}

export interface SubtasksResponse {
  subtasks: SubtaskSummary[];
  progress: SubtaskProgress;
}

export interface MajorIncidentCommunicationPlan {
  internalStakeholders: string[];
  externalStakeholders: string[];
  updateFrequencyMinutes: number;
  channels: string[];
}

export interface MajorIncidentStakeholderUpdate {
  timestamp: string;
  authorId: string;
  authorName?: string;
  authorPhotoUrl?: string;
  message: string;
  type: "status_update" | "comms" | "technical";
}

export interface MajorIncidentPerson {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  department?: string;
  jobTitle?: string;
}

export interface MajorIncidentTicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  reporterId: string;
  reporterName?: string;
  assigneeId?: string;
  assigneeName?: string;
  linkedProblemId?: string;
}

export interface MajorIncidentTimelineEntry {
  id: string;
  action: string;
  label: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MajorIncidentRecord {
  id: string;
  tenantId: string;
  ticketId: string;
  severity: "sev1" | "sev2" | "sev3";
  incidentCommanderId?: string;
  communicationLeadId?: string;
  bridgeUrl?: string;
  bridgePhone?: string;
  affectedServices: string[];
  affectedCiIds: string[];
  estimatedAffectedUsers: number;
  businessImpact?: "critical" | "high" | "medium" | "low";
  status:
    | "declared"
    | "investigating"
    | "mitigating"
    | "mitigated"
    | "monitoring"
    | "resolved"
    | "pir_pending"
    | "closed";
  stakeholderUpdates: MajorIncidentStakeholderUpdate[];
  resolutionSummary?: string;
  rootCauseSummary?: string;
  pirScheduledDate?: string;
  pirCompletedDate?: string;
  pirReport?: Record<string, unknown>;
  communicationPlan: MajorIncidentCommunicationPlan;
  declaredAt: string;
  resolvedAt?: string;
  closedAt?: string;
  totalDurationMinutes?: number;
  createdAt: string;
  updatedAt: string;
  lastUpdateAt?: string;
  lastUpdateMessage?: string;
  ticket?: MajorIncidentTicketSummary;
  incidentCommander?: MajorIncidentPerson;
  communicationLead?: MajorIncidentPerson;
  timeline?: MajorIncidentTimelineEntry[];
}

export interface MajorIncidentStats {
  total: number;
  active: number;
  avgDurationMinutes: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
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
  rcaTemplateId?: string;
  rcaData?: Record<string, unknown>;
  rootCause?: string;
  status: string;
  linkedIncidentIds: string[];
  linkedAssetIds?: string[];
  linkedCiIds?: string[];
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

export type UpdateProblemPayload = Partial<
  Pick<
    ITSMProblem,
    | "title"
    | "description"
    | "rootCause"
    | "workaround"
    | "permanentFix"
    | "linkedChangeId"
    | "ownerId"
    | "assignedGroupId"
    | "rcaTemplateId"
    | "rcaData"
    | "linkedAssetIds"
    | "linkedCiIds"
  >
>;

export interface ProblemRCATemplate {
  id: string;
  tenantId?: string;
  name: string;
  method: string;
  schema: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface CreateChangePayload {
  title: string;
  description: string;
  classification: string;
  changeType: string;
  urgency: string;
  impact: string;
  riskLevel?: string;
  riskAssessment?: Record<string, unknown>;
  implementationPlan?: string;
  rollbackPlan?: string;
  testPlan?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  assigneeId?: string;
  teamQueueId?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateChangePayload {
  title?: string;
  description?: string;
  changeType?: string;
  riskLevel?: string;
  riskAssessment?: Record<string, unknown>;
  implementationPlan?: string;
  rollbackPlan?: string;
  testPlan?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  assigneeId?: string;
  category?: string;
  tags?: string[];
}

export interface CreateCABMeetingPayload {
  title: string;
  description?: string;
  scheduledDate: string;
  chairId?: string;
  attendees?: string[];
  durationMinutes?: number;
  location?: string;
  meetingType?: string;
  secretaryUserId?: string;
  agenda?: Record<string, unknown>;
  changeTicketIds?: string[];
}

export interface UpdateCABMeetingPayload {
  title?: string;
  description?: string;
  scheduledDate?: string;
  chairId?: string;
  attendees?: string[];
  minutes?: string;
  status?: string;
  durationMinutes?: number;
  location?: string;
  meetingType?: string;
  secretaryUserId?: string;
  agenda?: Record<string, unknown>;
  changeTicketIds?: string[];
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
  reviewDate?: string;
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
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SLADependencyChainEntry {
  id: string;
  slaPolicyId: string;
  /** Backend serialises as "slaName" - slaPolicyName kept as alias for backwards compat */
  slaName?: string;
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
  parentSlaName: string;
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
  { value: "suspended", label: "Suspended" },
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

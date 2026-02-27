/* =============================================================================
   Core TypeScript Types — ITD-OPMS Portal
   ============================================================================= */

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
  avatarUrl?: string;
  department?: string;
  jobTitle?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  domain?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  tenantId: string;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
  message?: string;
}

/* =============================================================================
   Notification Types
   ============================================================================= */

export interface Notification {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  channelPreferences: Record<string, boolean>;
  digestFrequency: "immediate" | "daily" | "weekly";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  disabledTypes: string[];
}

/* ------------------------------------------------------------------ */
/*  Governance Module Types                                            */
/* ------------------------------------------------------------------ */

export interface Policy {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  scopeType: string;
  scopeTenantIds?: string[];
  status: string;
  version: number;
  content: string;
  effectiveDate?: string;
  reviewDate?: string;
  expiryDate?: string;
  ownerId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  title: string;
  content: string;
  changesSummary?: string;
  createdBy: string;
  createdAt: string;
}

export interface PolicyAttestation {
  id: string;
  policyId: string;
  policyVersion: number;
  userId: string;
  tenantId: string;
  attestedAt?: string;
  status: string;
  campaignId?: string;
  reminderSentAt?: string;
}

export interface AttestationCampaign {
  id: string;
  tenantId: string;
  policyId: string;
  policyVersion: number;
  targetScope: string;
  targetUserIds?: string[];
  dueDate: string;
  status: string;
  completionRate: number;
  createdBy: string;
  createdAt: string;
}

export interface AttestationStatus {
  totalUsers: number;
  attestedCount: number;
  pendingCount: number;
  overdueCount: number;
  completionRate: number;
}

export interface VersionDiff {
  v1: number;
  v2: number;
  oldTitle: string;
  newTitle: string;
  oldContent: string;
  newContent: string;
}

export interface RACIMatrix {
  id: string;
  tenantId: string;
  title: string;
  entityType: string;
  entityId?: string;
  description?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  entries?: RACIEntry[];
}

export interface RACIEntry {
  id: string;
  matrixId: string;
  activity: string;
  responsibleIds: string[];
  accountableId: string;
  consultedIds?: string[];
  informedIds?: string[];
  notes?: string;
}

export interface Meeting {
  id: string;
  tenantId: string;
  title: string;
  meetingType?: string;
  agenda?: string;
  minutes?: string;
  location?: string;
  scheduledAt: string;
  durationMinutes?: number;
  recurrenceRule?: string;
  templateAgenda?: string;
  attendeeIds?: string[];
  organizerId: string;
  status: string;
  createdAt: string;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  tenantId: string;
  decisionNumber: string;
  title: string;
  description: string;
  rationale?: string;
  impactAssessment?: string;
  decidedByIds?: string[];
  status: string;
  evidenceRefs?: string[];
  createdAt: string;
}

export interface ActionItem {
  id: string;
  tenantId: string;
  sourceType: string;
  sourceId: string;
  title: string;
  description?: string;
  ownerId: string;
  dueDate: string;
  status: string;
  completionEvidence?: string;
  completedAt?: string;
  priority: string;
  createdAt: string;
}

export interface OKR {
  id: string;
  tenantId: string;
  parentId?: string;
  level: string;
  scopeId?: string;
  objective: string;
  period: string;
  ownerId: string;
  status: string;
  progressPct: number;
  scoringMethod: string;
  createdAt: string;
  keyResults?: KeyResult[];
  children?: OKR[];
}

export interface KeyResult {
  id: string;
  okrId: string;
  title: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  status: string;
  updatedAt: string;
}

export interface KPI {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  formula?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  currentValue?: number;
  unit?: string;
  frequency: string;
  ownerId?: string;
  lastUpdatedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Planning Module Types                                              */
/* ------------------------------------------------------------------ */

export interface Portfolio {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  ownerId?: string;
  fiscalYear: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  tenantId: string;
  portfolioId?: string;
  title: string;
  code: string;
  description?: string;
  charter?: string;
  scope?: string;
  businessCase?: string;
  sponsorId?: string;
  projectManagerId?: string;
  status: string;
  ragStatus: string;
  priority: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  budgetApproved?: number;
  budgetSpent?: number;
  completionPct?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDependency {
  id: string;
  projectId: string;
  dependsOnProjectId: string;
  dependencyType: string;
  description?: string;
  impactIfDelayed?: string;
  createdAt: string;
}

export interface ProjectStakeholder {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  influence?: string;
  interest?: string;
  communicationPreference?: string;
  createdAt: string;
}

export interface WorkItem {
  id: string;
  tenantId: string;
  projectId: string;
  parentId?: string;
  type: string;
  title: string;
  description?: string;
  assigneeId?: string;
  reporterId?: string;
  status: string;
  priority: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  children?: WorkItem[];
}

export interface PlanningMilestone {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  description?: string;
  targetDate: string;
  actualDate?: string;
  status: string;
  evidenceRefs: string[];
  completionCriteria?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  workItemId: string;
  userId: string;
  hours: number;
  description?: string;
  loggedDate: string;
  createdAt: string;
}

export interface Risk {
  id: string;
  tenantId: string;
  projectId?: string;
  title: string;
  description?: string;
  category?: string;
  likelihood: string;
  impact: string;
  riskScore: number;
  status: string;
  mitigationPlan?: string;
  contingencyPlan?: string;
  ownerId?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectIssue {
  id: string;
  tenantId: string;
  projectId?: string;
  title: string;
  description?: string;
  category?: string;
  severity: string;
  status: string;
  assigneeId?: string;
  resolution?: string;
  escalationLevel: number;
  escalatedToId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRequest {
  id: string;
  tenantId: string;
  projectId?: string;
  title: string;
  description?: string;
  justification?: string;
  impactAssessment?: string;
  status: string;
  requestedBy: string;
  reviewedBy?: string;
  approvalChainId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onTimeDeliveryPct: number;
  avgCompletionPct: number;
  totalBudgetApproved: number;
  totalBudgetSpent: number;
  ragSummary: Record<string, number>;
}

export interface WorkItemStatusCount {
  status: string;
  count: number;
}

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
  resolutionNotes?: string;
  resolvedAt?: string;
  closedAt?: string;
  firstResponseAt?: string;
  satisfactionScore?: number;
  tags: string[];
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

/* ====================================================================== */
/*  CMDB Types                                                             */
/* ====================================================================== */

export interface Asset {
  id: string;
  tenantId: string;
  assetTag: string;
  type: string;
  category?: string;
  name: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  location?: string;
  building?: string;
  floor?: string;
  room?: string;
  ownerId?: string;
  custodianId?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currency: string;
  classification?: string;
  attributes?: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetLifecycleEvent {
  id: string;
  assetId: string;
  tenantId: string;
  eventType: string;
  performedBy: string;
  details?: Record<string, unknown>;
  evidenceDocumentId?: string;
  createdAt: string;
}

export interface AssetDisposal {
  id: string;
  assetId: string;
  tenantId: string;
  disposalMethod: string;
  reason?: string;
  approvedBy?: string;
  approvalChainId?: string;
  disposalDate?: string;
  disposalCertificateDocId?: string;
  witnessIds: string[];
  dataWipeConfirmed: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CMDBItem {
  id: string;
  tenantId: string;
  ciType: string;
  name: string;
  status: string;
  assetId?: string;
  attributes?: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CMDBRelationship {
  id: string;
  sourceCiId: string;
  targetCiId: string;
  relationshipType: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReconciliationRun {
  id: string;
  tenantId: string;
  source: string;
  startedAt: string;
  completedAt?: string;
  matches: number;
  discrepancies: number;
  newItems: number;
  report?: Record<string, unknown>;
  createdAt: string;
}

export interface License {
  id: string;
  tenantId: string;
  softwareName: string;
  vendor?: string;
  licenseType: string;
  totalEntitlements: number;
  assignedCount: number;
  complianceStatus: string;
  expiryDate?: string;
  cost?: number;
  renewalContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseAssignment {
  id: string;
  licenseId: string;
  tenantId: string;
  userId?: string;
  assetId?: string;
  assignedAt: string;
}

export interface Warranty {
  id: string;
  assetId: string;
  tenantId: string;
  vendor?: string;
  contractNumber?: string;
  coverageType?: string;
  startDate: string;
  endDate: string;
  cost?: number;
  renewalStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalAlert {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  alertDate: string;
  sent: boolean;
  createdAt: string;
}

export interface AssetStats {
  total: number;
  activeCount: number;
  maintenanceCount: number;
  retiredCount: number;
}

export interface LicenseComplianceStats {
  total: number;
  compliant: number;
  overDeployed: number;
  underUtilized: number;
}

/* ====================================================================== */
/*  People & Workforce Types                                               */
/* ====================================================================== */

export interface SkillCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  id: string;
  tenantId: string;
  userId: string;
  skillId: string;
  proficiencyLevel: string;
  certified: boolean;
  certificationName?: string;
  certificationExpiry?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleSkillRequirement {
  id: string;
  tenantId: string;
  roleType: string;
  skillId: string;
  requiredLevel: string;
  createdAt: string;
}

export interface SkillGapEntry {
  skillName: string;
  requiredLevel: string;
  currentLevel: string;
}

export interface PeopleChecklistTemplate {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  roleType?: string;
  tasks: Array<{ title: string; description?: string; assigneeRole?: string; dueDays?: number; required?: boolean }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PeopleChecklist {
  id: string;
  tenantId: string;
  templateId?: string;
  userId: string;
  type: string;
  status: string;
  completionPct: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistTask {
  id: string;
  checklistId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  evidenceDocId?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Roster {
  id: string;
  tenantId: string;
  teamId?: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  shifts: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRecord {
  id: string;
  tenantId: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityAllocation {
  id: string;
  tenantId: string;
  userId: string;
  projectId?: string;
  allocationPct: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecord {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  provider?: string;
  type: string;
  status: string;
  completedAt?: string;
  expiryDate?: string;
  certificateDocId?: string;
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

/* ====================================================================== */
/*  Knowledge Management Types                                              */
/* ====================================================================== */

export interface KBCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KBArticle {
  id: string;
  tenantId: string;
  categoryId?: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  version: number;
  type: string;
  tags: string[];
  authorId: string;
  reviewerId?: string;
  publishedAt?: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  linkedTicketIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KBArticleVersion {
  id: string;
  articleId: string;
  version: number;
  content: string;
  changedBy: string;
  createdAt: string;
}

export interface KBArticleFeedback {
  id: string;
  articleId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: string;
}

export interface FeedbackStats {
  total: number;
  helpful: number;
  notHelpful: number;
}

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  targetIds: string[];
  publishedAt?: string;
  expiresAt?: string;
  authorId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

/* ====================================================================== */
/*  Reporting & Analytics Types                                              */
/* ====================================================================== */

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  template: Record<string, unknown>;
  scheduleCron?: string;
  recipients: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRun {
  id: string;
  definitionId: string;
  tenantId: string;
  status: string;
  triggerSource: string;
  scheduledFor?: string;
  generatedAt?: string;
  completedAt?: string;
  documentId?: string;
  dataSnapshot: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
}

export interface ExecutiveSummary {
  tenantId: string;
  activePolicies: number;
  overdueActions: number;
  pendingAttestations: number;
  avgOkrProgress: number;
  openTickets: number;
  criticalTickets: number;
  openTicketsP1: number;
  openTicketsP2: number;
  openTicketsP3: number;
  openTicketsP4: number;
  slaCompliancePct: number;
  mttrMinutes: number;
  mttaMinutes: number;
  backlogOver30Days: number;
  activeProjects: number;
  projectsRagGreen: number;
  projectsRagAmber: number;
  projectsRagRed: number;
  onTimeDeliveryPct: number;
  milestoneBurnDownPct: number;
  activeAssets: number;
  assetCountsByType: Record<string, number>;
  assetCountsByStatus: Record<string, number>;
  overDeployedLicenses: number;
  licenseCompliancePct: number;
  warrantiesExpiring90Days: number;
  highRisks: number;
  criticalRisks: number;
  auditReadinessScore: number;
  accessReviewCompletionPct: number;
  teamCapacityUtilizationPct: number;
  overdueTrainingCerts: number;
  expiringCerts: number;
  openP1Incidents: number;
  slaBreaches24h: number;
  refreshedAt: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface SLAComplianceRate {
  rate: number;
}

export interface SavedSearch {
  id: string;
  tenantId: string;
  userId: string;
  query: string;
  entityTypes: string[];
  isSaved: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export interface GlobalSearchResults {
  tickets?: { results: Array<{ id: string; title: string; status: string }>; count: number };
  articles?: { results: Array<{ id: string; title: string; slug: string }>; count: number };
  assets?: { results: Array<{ id: string; name: string; assetTag: string }>; count: number };
  projects?: { results: Array<{ id: string; name: string; status: string }>; count: number };
  policies?: { results: Array<{ id: string; title: string; status: string }>; count: number };
  users?: {
    results: Array<{ id: string; displayName: string; email: string; department?: string; jobTitle?: string }>;
    count: number;
  };
  meetings?: { results: Array<{ id: string; title: string; status: string; scheduledAt: string }>; count: number };
  decisions?: {
    results: Array<{ id: string; meetingId: string; decisionNumber: string; title: string; status: string }>;
    count: number;
  };
}

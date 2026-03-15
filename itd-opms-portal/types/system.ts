/* ====================================================================== */
/*  System Administration Types                                              */
/* ====================================================================== */

export interface UserDetail {
  id: string;
  entraId?: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  office?: string;
  unit?: string;
  tenantId: string;
  tenantName: string;
  photoUrl?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  orgUnitId?: string;
  orgUnitName?: string;
  roles: RoleBinding[];
  delegations: Delegation[];
}

export interface UserSearchResult {
  id: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  department?: string;
  isActive: boolean;
}

export interface RoleDetail {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  userCount: number;
}

export interface RoleBinding {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tenantId: string;
  scopeType: string;
  scopeId?: string;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface Delegation {
  id: string;
  delegatorId: string;
  delegatorName: string;
  delegateId: string;
  delegateName: string;
  roleId: string;
  roleName: string;
  tenantId: string;
  reason: string;
  approvedBy?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface PermissionCatalog {
  module: string;
  permissions: string[];
}

export interface TenantDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId?: string;
  parentName: string;
  isActive: boolean;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  children: TenantSummary[];
}

export interface TenantSummary {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  userCount: number;
}

export interface OrgUnitDetail {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  level: string;
  parentId?: string;
  parentName: string;
  managerUserId?: string;
  managerName: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  childCount: number;
  userCount: number;
}

export interface OrgTreeNode {
  id: string;
  name: string;
  code: string;
  level: string;
  managerName: string;
  userCount: number;
  children: OrgTreeNode[];
}

/* Org Analytics */
export interface OrgAnalyticsResponse {
  totalUnits: number;
  activeUnits: number;
  inactiveUnits: number;
  maxDepth: number;
  avgSpanOfControl: number;
  vacantLeadership: number;
  totalHeadcount: number;
  headcountByLevel: LevelHeadcount[];
  spanDistribution: SpanRange[];
  unitsByLevel: LevelCount[];
  recentChanges: OrgRecentChange[];
  growthTimeline: OrgGrowthPoint[];
}

export interface LevelHeadcount {
  level: string;
  count: number;
  unitCount: number;
}

export interface SpanRange {
  range: string;
  count: number;
}

export interface LevelCount {
  level: string;
  count: number;
}

export interface OrgRecentChange {
  action: string;
  unitName: string;
  changedBy: string;
  changedAt: string;
}

export interface OrgGrowthPoint {
  month: string;
  cumulative: number;
}

export interface SystemSetting {
  id: string;
  tenantId?: string;
  category: string;
  key: string;
  value: unknown;
  description?: string;
  isSecret: boolean;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface AuditEventDetail {
  id: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  correlationId: string;
  checksum: string;
  createdAt: string;
}

export interface AuditStatsResponse {
  eventsPerDay: Array<{ date: string; count: number }>;
  topActors: Array<{ actorId: string; actorName: string; count: number }>;
  topEntities: Array<{ entityType: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  totalEvents: number;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: Record<string, unknown>;
  location: string;
  createdAt: string;
  lastActive: string;
  expiresAt: string;
  isRevoked: boolean;
}

export interface SessionMgmtStats {
  activeSessions: number;
  uniqueUsers: number;
}

export interface PlatformHealth {
  status: string;
  uptime: string;
  version: string;
  goVersion: string;
  services: ServiceHealth[];
  timestamp: string;
}

export interface ServiceHealth {
  name: string;
  status: string;
  latency: string;
  details: string;
}

export interface SystemStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    onlineNow: number;
    newThisMonth: number;
  };
  sessions: {
    activeSessions: number;
    uniqueUsers: number;
    byDevice: Record<string, number>;
  };
  auditEvents: {
    totalEvents: number;
    eventsToday: number;
    eventsThisWeek: number;
    integrityStatus: string;
    lastVerified?: string;
  };
  storage: {
    totalObjects: number;
    totalSize: string;
    evidenceItems: number;
    attachments: number;
  };
  database: {
    size: string;
    tableCount: number;
    activeConnections: number;
    maxConnections: number;
  };
  modules: Array<{
    name: string;
    recordCount: number;
    activeItems: number;
    lastActivity?: string;
  }>;
}

export interface DirectorySyncStatus {
  enabled: boolean;
  lastSync?: string;
  lastSyncStatus: string;
  nextScheduled?: string;
  usersAdded: number;
  usersUpdated: number;
  usersRemoved: number;
  syncHistory: SyncRun[];
}

export interface SyncRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  usersAdded: number;
  usersUpdated: number;
  usersRemoved: number;
  errors: number;
  errorDetails: string;
}

export interface EmailTemplate {
  id: string;
  tenantId?: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables: unknown[];
  category: string;
  isActive: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/* =============================================================================
   Approval Workflow Engine Types
   ============================================================================= */

export type StepMode = "sequential" | "parallel" | "any_of";

export interface WorkflowStepDef {
  stepOrder: number;
  name: string;
  mode: StepMode;
  quorum: number;
  approverType: string;
  approverIds: string[];
  timeoutHours: number;
  allowDelegation: boolean;
}

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  entityType: string;
  steps: WorkflowStepDef[];
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalChain {
  id: string;
  entityType: string;
  entityId: string;
  tenantId: string;
  workflowDefinitionId?: string;
  status: string;
  currentStep: number;
  urgency: string;
  deadline?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  steps?: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  chainId: string;
  stepOrder: number;
  approverId: string;
  approverName: string;
  decision: "pending" | "approved" | "rejected" | "skipped";
  comments: string | null;
  decidedAt: string | null;
  evidenceRefs: string[];
  delegatedFrom: string | null;
  reminderSentAt: string | null;
  deadline: string | null;
  createdAt: string;
}

export interface PendingApprovalItem {
  stepId: string;
  chainId: string;
  entityType: string;
  entityId: string;
  stepOrder: number;
  stepName: string;
  urgency: string;
  deadline?: string;
  requestedBy: string;
  requestedAt: string;
  chainStatus: string;
}

export interface ApprovalHistoryItem {
  chainId: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  urgency: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

/* =============================================================================
   Change Calendar Types
   ============================================================================= */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  eventType: string;
  status: string;
  impactLevel?: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  color: string;
  createdBy?: string;
}

export interface MaintenanceWindow {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  windowType: string;
  status: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  recurrenceRule?: string;
  affectedServices: string[];
  impactLevel: string;
  changeRequestId?: string;
  ticketId?: string;
  projectId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeFreezePeriod {
  id: string;
  tenantId: string;
  name: string;
  reason?: string;
  startTime: string;
  endTime: string;
  exceptions: string[];
  createdBy: string;
  createdAt: string;
}

export interface ConflictResult {
  overlappingEvents: CalendarEvent[];
  freezePeriods: ChangeFreezePeriod[];
}

/* =============================================================================
   Document Vault Types — defined in hooks/use-vault.ts (single source of truth)
   ============================================================================= */

/* =============================================================================
   Workflow Automation Types
   ============================================================================= */

export type AutomationTriggerType = "event" | "schedule" | "condition";

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  conditionConfig: Record<string, unknown>;
  actions: Record<string, unknown>[];
  maxExecutionsPerHour: number;
  cooldownMinutes: number;
  executionCount: number;
  lastExecutedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName?: string;
  tenantId: string;
  triggerEvent?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  actionsTaken: Record<string, unknown>[];
  status: "success" | "partial" | "failed";
  errorMessage?: string;
  durationMs?: number;
  executedAt: string;
}

export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  executionsToday: number;
  failuresToday: number;
}

/* =============================================================================
   Custom Fields Types
   ============================================================================= */

export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "url"
  | "email"
  | "phone"
  | "user_reference";

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  description?: string;
  isRequired: boolean;
  isFilterable: boolean;
  isVisibleInList: boolean;
  displayOrder: number;
  validationRules: Record<string, unknown>;
  defaultValue?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldOption {
  value: string;
  label: string;
}

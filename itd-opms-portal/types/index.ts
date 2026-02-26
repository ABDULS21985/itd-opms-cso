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

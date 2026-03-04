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

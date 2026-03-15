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
  // Live metrics computed outside the materialized view
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

/**
 * The canonical set of entity types the global search backend supports.
 * This must stay in sync with the `allTypes` map in search_service.go.
 */
export type SearchEntityType =
  | "tickets"
  | "articles"
  | "assets"
  | "projects"
  | "policies"
  | "users"
  | "meetings"
  | "decisions";

export interface SavedSearch {
  id: string;
  tenantId: string;
  userId: string;
  query: string;
  entityTypes: SearchEntityType[];
  isSaved: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export interface GlobalSearchResults {
  tickets?: {
    results: Array<{
      id: string;
      ticketNumber: string;
      title: string;
      status: string;
      priority: string;
    }>;
    count: number;
  };
  articles?: {
    results: Array<{ id: string; title: string; slug: string; status: string }>;
    count: number;
  };
  assets?: {
    results: Array<{
      id: string;
      name: string;
      assetTag: string;
      assetType: string;
      status: string;
    }>;
    count: number;
  };
  projects?: {
    results: Array<{ id: string; name: string; status: string; priority: string }>;
    count: number;
  };
  policies?: {
    results: Array<{ id: string; title: string; status: string }>;
    count: number;
  };
  users?: {
    results: Array<{
      id: string;
      displayName: string;
      email: string;
      department?: string | null;
      jobTitle?: string | null;
    }>;
    count: number;
  };
  meetings?: {
    results: Array<{ id: string; title: string; status: string; scheduledAt: string }>;
    count: number;
  };
  decisions?: {
    results: Array<{
      id: string;
      meetingId: string;
      decisionNumber: string;
      title: string;
      status: string;
    }>;
    count: number;
  };
}

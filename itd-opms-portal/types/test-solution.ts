export interface TestSolutionRun {
  id: string;
  tenantId: string;
  runNumber: string;
  title: string;
  description?: string;
  sourceType: string;
  sourceId?: string;
  releaseId?: string;
  releaseNumber?: string;
  changeTicketId?: string;
  changeTicketNumber?: string;
  status: string;
  requiredTestTypes: string[];
  authorizedTestTypes: string[];
  testManagerId?: string;
  testManagerName?: string;
  testLeadId?: string;
  testLeadName?: string;
  releaseManagementLeadId?: string;
  releaseManagementLeadName?: string;
  requirements?: Record<string, unknown>;
  testPlan?: Record<string, unknown>;
  readinessChecklist?: unknown[];
  evidence?: Record<string, unknown>;
  uatSignoff?: Record<string, unknown>;
  overallOutcome: string;
  failureReason?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestSolutionRunWithDetails extends TestSolutionRun {
  cases?: TestSolutionCase[];
  signoffs?: TestSolutionSignoff[];
}

export interface TestSolutionCase {
  id: string;
  tenantId: string;
  runId: string;
  testType: string;
  title: string;
  scriptReference?: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  evidence?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestSolutionSignoff {
  id: string;
  tenantId: string;
  runId: string;
  testType: string;
  signerId: string;
  signerName?: string;
  roleName: string;
  status: string;
  comments?: string;
  evidence?: Record<string, unknown>;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestSolutionStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  pendingSignoffs: number;
}

export interface TestSolutionListResponse {
  data: TestSolutionRun[];
  meta?: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
}

export const TEST_SOLUTION_STATUSES = [
  { value: "intake", label: "Intake" },
  { value: "planning", label: "Planning" },
  { value: "authorized", label: "Authorized" },
  { value: "system_prereq", label: "System prerequisites" },
  { value: "system_planning", label: "System planning" },
  { value: "system_preparation", label: "System preparation" },
  { value: "system_readiness", label: "System readiness" },
  { value: "system_execution", label: "System execution" },
  { value: "system_review", label: "System review" },
  { value: "integration_preparation", label: "Integration preparation" },
  { value: "integration_execution", label: "Integration execution" },
  { value: "stress_preparation", label: "Stress preparation" },
  { value: "stress_execution", label: "Stress execution" },
  { value: "security_preparation", label: "Security preparation" },
  { value: "security_execution", label: "Security execution" },
  { value: "data_conversion_preparation", label: "Data conversion preparation" },
  { value: "data_conversion_execution", label: "Data conversion execution" },
  { value: "uat_confirmation", label: "UAT confirmation" },
  { value: "uat_preparation", label: "UAT preparation" },
  { value: "uat_nominees", label: "UAT nominees" },
  { value: "uat_execution", label: "UAT execution" },
  { value: "uat_review", label: "UAT review" },
  { value: "release_handoff", label: "Release handoff" },
  { value: "build_rework", label: "Build rework" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const TEST_TYPES = [
  { value: "system", label: "System test" },
  { value: "integration", label: "Integration test" },
  { value: "stress_performance", label: "Stress/performance test" },
  { value: "security", label: "Security test" },
  { value: "data_conversion", label: "Data conversion test" },
  { value: "uat", label: "User acceptance test" },
] as const;

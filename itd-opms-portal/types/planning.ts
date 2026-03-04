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
  divisionId?: string;
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
  divisionName?: string;
  portfolioName?: string;
  sponsorName?: string;
  projectManagerName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDivisionAssignment {
  id: string;
  projectId: string;
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  assignmentType: string;
  assignedBy?: string;
  assignedAt: string;
  unassignedAt?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

export interface DivisionAssignmentLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fromDivisionId?: string;
  fromDivisionName?: string;
  toDivisionId?: string;
  toDivisionName?: string;
  performedBy: string;
  performerName?: string;
  notes?: string;
  createdAt: string;
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

/* ================================================================== */
/*  FR-C009: Project Timeline / Gantt                                  */
/* ================================================================== */

export interface ProjectTimeline {
  project: TimelineProject;
  milestones: TimelineMilestone[];
  workItems: TimelineWorkItem[];
  dependencies: TimelineDependency[];
}

export interface TimelineProject {
  id: string;
  title: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  completionPct: number;
  status: string;
  ragStatus: string;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  targetDate: string;
  actualDate?: string;
  status: string;
}

export interface TimelineWorkItem {
  id: string;
  title: string;
  type: string;
  parentId?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  assigneeName?: string;
  sortOrder: number;
}

export interface TimelineDependency {
  fromProjectId: string;
  toProjectId: string;
  type: string;
}

export interface PortfolioTimelineItem {
  id: string;
  title: string;
  code: string;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  completionPct: number;
  status: string;
  ragStatus: string;
}

/* ================================================================== */
/*  FR-C016: Post-Implementation Review (PIR)                          */
/* ================================================================== */

export interface PIR {
  id: string;
  tenantId: string;
  projectId: string;
  projectTitle: string;
  title: string;
  status: string;
  reviewType: string;
  scheduledDate?: string;
  completedDate?: string;
  facilitatorId?: string;
  facilitatorName?: string;
  objectivesMet?: string;
  scopeAdherence?: string;
  timelineAdherence?: string;
  budgetAdherence?: string;
  qualityAssessment?: string;
  stakeholderSatisfaction?: string;
  successes: PIRSuccess[];
  challenges: PIRChallenge[];
  lessonsLearned: PIRLesson[];
  recommendations: PIRRecommendation[];
  overallScore?: number;
  participants: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PIRSuccess {
  description: string;
  category: string;
  impact?: string;
}

export interface PIRChallenge {
  description: string;
  category: string;
  rootCause?: string;
  impact?: string;
}

export interface PIRLesson {
  description: string;
  category: string;
  recommendation?: string;
  applicability?: string;
}

export interface PIRRecommendation {
  description: string;
  owner?: string;
  priority?: string;
  dueDate?: string;
  status?: string;
}

export interface PIRTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  reviewType: string;
  sections: PIRTemplateSection[];
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PIRTemplateSection {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

export interface PIRStats {
  totalPirs: number;
  completedPirs: number;
  avgScore: number;
  pendingPirs: number;
}

/* ================================================================== */
/*  Project Documents                                                  */
/* ================================================================== */

export type ProjectDocumentCategory =
  | "project_charter"
  | "project_approval"
  | "business_case"
  | "business_requirements"
  | "solution_architecture"
  | "solution_design"
  | "solution_brief"
  | "technical_specification"
  | "test_plan"
  | "test_results"
  | "user_manual"
  | "training_material"
  | "deployment_guide"
  | "meeting_minutes"
  | "status_report"
  | "risk_register"
  | "change_request"
  | "sign_off"
  | "closure_report"
  | "other";

export interface ProjectDocument {
  id: string;
  tenantId: string;
  projectId: string;
  documentId: string;
  category: ProjectDocumentCategory;
  label?: string;
  version: string;
  displayOrder: number;
  status: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description?: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploaderName?: string;
}

export interface ProjectDocumentCategoryCount {
  category: ProjectDocumentCategory;
  count: number;
}

export interface DocumentDownloadResponse {
  url: string;
  fileName: string;
}

/* =============================================================================
   Resource Heatmap Types
   ============================================================================= */

export interface HeatmapResponse {
  periods: string[];
  rows: HeatmapRow[];
  summary: HeatmapSummary;
}

export interface HeatmapRow {
  id: string;
  label: string;
  cells: HeatmapCell[];
  averageLoad: number;
}

export interface HeatmapCell {
  period: string;
  allocationPct: number;
  projectCount: number;
  projects?: HeatmapProject[];
}

export interface HeatmapProject {
  id: string;
  title: string;
  pct: number;
}

export interface HeatmapSummary {
  totalUsers: number;
  overAllocatedUsers: number;
  underUtilizedUsers: number;
  averageUtilization: number;
}

export interface AllocationEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string;
  projectId: string;
  projectTitle?: string;
  allocationPct: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

/* =============================================================================
   Budget & Cost Tracking Types
   ============================================================================= */

export interface CostCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  code?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CostEntry {
  id: string;
  tenantId: string;
  projectId: string;
  categoryId?: string;
  categoryName?: string;
  description: string;
  amount: number;
  entryType: "actual" | "committed" | "forecast";
  entryDate: string;
  vendorName?: string;
  invoiceRef?: string;
  documentId?: string;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  projectId: string;
  approvedBudget: number;
  actualSpend: number;
  committedSpend: number;
  forecastTotal: number;
  remainingBudget: number;
  variancePct: number;
  burnRate: number;
  monthsRemaining: number;
  estimatedAtCompletion: number;
  costPerformanceIndex: number;
  byCategory: CategorySpend[];
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  actual: number;
  committed: number;
  forecast: number;
}

export interface BurnRatePoint {
  period: string;
  actual: number;
  committed: number;
  forecast: number;
  cumulativeActual: number;
  budgetLine: number;
}

export interface BudgetSnapshot {
  id: string;
  tenantId: string;
  projectId: string;
  snapshotDate: string;
  approvedBudget: number;
  actualSpend: number;
  committedSpend: number;
  forecastTotal: number;
  completionPct?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface PortfolioBudgetItem {
  projectId: string;
  projectTitle: string;
  status: string;
  approvedBudget: number;
  actualSpend: number;
  remainingBudget: number;
  variancePct: number;
}

/* =============================================================================
   Bulk Project Import Types
   ============================================================================= */

export interface ImportRowError {
  column: string;
  code: string;
  message: string;
}

export interface ImportRow {
  rowNumber: number;
  title: string;
  code: string;
  description: string;
  portfolioName: string;
  divisionName: string;
  sponsorEmail: string;
  projectManagerEmail: string;
  status: string;
  priority: string;
  plannedStart: string;
  plannedEnd: string;
  budgetApproved: string;
  charter: string;
  scope: string;
  businessCase: string;
  isValid: boolean;
  errors?: ImportRowError[];
}

export interface ValidateImportResponse {
  batchId: string;
  fileName: string;
  fileFormat: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportRow[];
}

export interface CommitImportResponse {
  batchId: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  createdIds?: string[];
  status: string;
}

export interface ImportBatch {
  id: string;
  tenantId: string;
  uploadedBy: string;
  fileName: string;
  fileFormat: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  failedRows: number;
  createdAt: string;
  completedAt?: string;
}

export interface ImportBatchError {
  id: string;
  batchId: string;
  rowNumber: number;
  columnName: string;
  fieldValue: string;
  errorCode: string;
  message: string;
}

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
  lastVerifiedAt?: string;
  lastVerifiedBy?: string;
  verificationStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetVerification {
  id: string;
  tenantId: string;
  assetId: string;
  verifierId: string;
  verifiedAt: string;
  locationConfirmed?: boolean;
  condition?: string;
  notes?: string;
  photoEvidenceIds: string[];
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

export interface CMDBTopologyStats {
  totalItems: number;
  totalRelationships: number;
  activeItems: number;
  focusedNeighborCount: number;
  typeCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  relationshipTypeCounts: Record<string, number>;
}

export interface CMDBTopology {
  items: CMDBItem[];
  relationships: CMDBRelationship[];
  focusCiId?: string;
  stats: CMDBTopologyStats;
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

export interface AssetProcessRun {
  id: string;
  tenantId: string;
  processNumber: string;
  processType: string;
  title: string;
  description?: string;
  sourceType: string;
  sourceId?: string;
  ticketId?: string;
  serviceRequestId?: string;
  assetId?: string;
  assignedAssetId?: string;
  stopGapAssetId?: string;
  requestedForId?: string;
  status: string;
  approvalRequired: boolean;
  approvalStatus: string;
  availabilityStatus: string;
  requesterStatus?: string;
  replacementEligible?: boolean;
  buybackOption?: boolean;
  buybackApproved?: boolean;
  exitReason?: string;
  warrantyStatus?: string;
  dataWipeConfirmed: boolean;
  deliverySigned: boolean;
  returnSigned: boolean;
  responsibleUserId?: string;
  accountableUserId?: string;
  details?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assetTag?: string;
  assetName?: string;
  assignedAssetTag?: string;
  stopGapAssetTag?: string;
  requestedForName?: string;
  responsibleUserName?: string;
  accountableUserName?: string;
  createdByName?: string;
  ticketNumber?: string;
  requestNumber?: string;
}

export interface AssetProcessEvent {
  id: string;
  tenantId: string;
  processId: string;
  fromStatus?: string;
  toStatus: string;
  action: string;
  actorId: string;
  actorName?: string;
  comment?: string;
  decision?: string;
  evidence?: Record<string, unknown>;
  createdAt: string;
}

export interface AssetProcessStats {
  total: number;
  deployment: number;
  redeployment: number;
  maintenance: number;
  retirementDisposal: number;
  open: number;
  closed: number;
  waitingList: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export const ASSET_PROCESS_TYPES = [
  { value: "deployment", label: "Asset deployment" },
  { value: "redeployment", label: "Asset redeployment" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retirement_disposal", label: "Retirement and disposal" },
  { value: "management_report", label: "Management report" },
] as const;

export const ASSET_PROCESS_STATUSES = [
  { value: "request_received", label: "Request received" },
  { value: "approval_review", label: "Approval review" },
  { value: "requester_check", label: "Requester check" },
  { value: "replacement_check", label: "Replacement check" },
  { value: "availability_check", label: "Availability check" },
  { value: "waiting_list", label: "Waiting list" },
  { value: "procurement", label: "Procurement" },
  { value: "issue_from_store", label: "Issue from store" },
  { value: "configuration", label: "Configuration" },
  { value: "issued_to_user", label: "Issued to user" },
  { value: "buyback_decision", label: "Buy-back decision" },
  { value: "buyback_approval", label: "Buy-back approval" },
  { value: "old_asset_return", label: "Old asset return" },
  { value: "data_wipe", label: "Data wipe" },
  { value: "redeployment_intake", label: "Redeployment intake" },
  { value: "asset_retrieval", label: "Asset retrieval" },
  { value: "maintenance_intake", label: "Maintenance intake" },
  { value: "warranty_check", label: "Warranty check" },
  { value: "vendor_dispatch", label: "Vendor dispatch" },
  { value: "stop_gap_issued", label: "Stop-gap issued" },
  { value: "repaired_received", label: "Repaired received" },
  { value: "maintenance_signoff", label: "Maintenance sign-off" },
  { value: "stop_gap_returned", label: "Stop-gap returned" },
  { value: "obsolete_identified", label: "Obsolete identified" },
  { value: "replacement_planned", label: "Replacement planned" },
  { value: "asset_database_updated", label: "Asset database updated" },
  { value: "degaussing_reported", label: "Degaussing reported" },
  { value: "management_reported", label: "Management reported" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export interface LicenseComplianceStats {
  total: number;
  compliant: number;
  overDeployed: number;
  underUtilized: number;
}

export interface CMDBQualityReport {
  totalCIs: number;
  activeCIs: number;
  cisMissingAsset: number;
  cisWithoutRelationships: number;
  totalAssets: number;
  assetsWithoutCI: number;
  unverifiedAssets: number;
  staleVerifiedAssets: number;
  latestReconciliationAt?: string;
  latestReconciliationSource?: string;
  latestReconciliationDiscrepancies: number;
  completenessScore: number;
  accuracyScore: number;
}

/* ====================================================================== */
/*  Discovery Types                                                        */
/* ====================================================================== */

export interface DiscoveryProfile {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  scanType: string;
  configuration: Record<string, unknown>;
  schedule?: string;
  isActive: boolean;
  lastRunAt?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryRun {
  id: string;
  tenantId: string;
  profileId: string;
  profileName?: string;
  scanType?: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  devicesFound: number;
  newCis: number;
  updatedCis: number;
  errors: unknown[];
  createdAt: string;
}

export interface DiscoveredDevice {
  id: string;
  runId: string;
  source?: string;
  hostname?: string;
  ipAddress?: string;
  macAddress?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  openPorts: number[];
  attributes: Record<string, unknown>;
  matchedCiId?: string;
  matchConfidence?: number;
  action?: string;
  createdAt: string;
}

export interface DiscoveryStats {
  totalProfiles: number;
  activeProfiles: number;
  totalRuns: number;
  lastRunAt?: string;
  adEnabled: boolean;
  adTenantId?: string;
  networkEnabled: boolean;
  sccmConfigured: boolean;
}

/* ====================================================================== */
/*  Verification Campaign Types                                            */
/* ====================================================================== */

export interface VerificationCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: string;
  scopeFilter: Record<string, unknown>;
  targetAssetCount: number;
  verifiedCount: number;
  discrepancyCount: number;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAsset {
  id: string;
  assetTag: string;
  name: string;
  type: string;
  status: string;
  location?: string;
  building?: string;
  floor?: string;
  room?: string;
  verificationStatus: string;
  lastVerifiedAt?: string;
}

export interface VerificationStats {
  total: number;
  verified: number;
  unverified: number;
  discrepancy: number;
  overdue: number;
}

/* ====================================================================== */
/*  ERP Integration Types                                                  */
/* ====================================================================== */

export interface AssetFinancialView {
  assetId: string;
  assetTag: string;
  assetName: string;
  purchasePrice?: number;
  purchaseCost?: number;
  currency?: string;
  currentBookValue?: number;
  depreciationRate?: number;
  costCenter?: string;
  poNumber?: string;
  erpAssetId?: string;
  erpSyncAt?: string;
  purchaseDate?: string;
}

export interface ERPSyncLog {
  id: string;
  tenantId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  assetsSynced: number;
  assetsFailed: number;
  errorDetails?: unknown;
  triggeredBy?: string;
  createdAt: string;
}

export interface ERPSyncStatus {
  erpEnabled: boolean;
  lastSync?: ERPSyncLog;
  totalSynced: number;
}

export interface MEGAImportResult {
  created: number;
  updated: number;
  skipped: number;
  relationshipsCreated: number;
  errors: string[];
}

export interface MEGAValidationResult {
  valid: boolean;
  itemCount: number;
  relationshipCount: number;
  errors?: string[];
}

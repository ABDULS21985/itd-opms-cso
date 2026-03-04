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

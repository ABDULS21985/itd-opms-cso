/* =============================================================================
   Vendor/Contract Management Types
   ============================================================================= */

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  vendorType: string;
  status: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  accountManagerName?: string;
  accountManagerEmail?: string;
  website?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  vendorId: string;
  vendorName?: string;
  contractNumber: string;
  title: string;
  description?: string;
  contractType: string;
  status: string;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
  totalValue?: number;
  annualValue?: number;
  currency: string;
  paymentSchedule?: string;
  slaTerms?: Record<string, unknown>;
  documentIds: string[];
  ownerId?: string;
  approvalChainId?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorScorecard {
  id: string;
  tenantId: string;
  vendorId: string;
  contractId?: string;
  reviewPeriod: string;
  qualityScore?: number;
  deliveryScore?: number;
  responsivenessScore?: number;
  costScore?: number;
  complianceScore?: number;
  overallScore?: number;
  strengths?: string;
  weaknesses?: string;
  improvementAreas?: string;
  notes?: string;
  slaMetrics?: Record<string, unknown>;
  reviewedBy: string;
  createdAt: string;
}

export interface ContractRenewal {
  id: string;
  contractId: string;
  tenantId: string;
  renewalType: string;
  newStartDate?: string;
  newEndDate?: string;
  newValue?: number;
  changeNotes?: string;
  approvalChainId?: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export interface VendorSummary {
  totalContracts: number;
  activeContracts: number;
  totalAnnualValue: number;
  avgScore: number;
}

export interface ContractDashboard {
  totalContracts: number;
  activeValue: number;
  expiringIn30: number;
  expiringIn60: number;
  expiringIn90: number;
}

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export enum EmployerVerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
}

export enum EmployerUserRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
}

// ──────────────────────────────────────────────
// Interfaces
// ──────────────────────────────────────────────

export interface EmployerOrg {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;

  companyName: string;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  description: string | null;
  sector: string | null;
  locationHq: string | null;
  country: string | null;

  hiringTracks: string[] | null;
  hiringWorkModes: string[] | null;

  verificationStatus: EmployerVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;

  totalRequests: number;
  totalPlacements: number;

  // Relations (optionally populated)
  employerUsers?: EmployerUser[];
}

export interface EmployerUser {
  id: string;
  createdAt: string;
  updatedAt: string;

  userId: string;
  orgId: string;
  contactName: string;
  roleTitle: string | null;
  phone: string | null;
  role: EmployerUserRole;

  // Relations (optionally populated)
  org?: EmployerOrg;
}
